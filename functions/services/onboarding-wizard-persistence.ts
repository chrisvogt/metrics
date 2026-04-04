import { FieldValue, type DocumentSnapshot } from 'firebase-admin/firestore'
import admin from 'firebase-admin'

import {
  TENANT_HOSTS_COLLECTION,
  TENANT_USERNAMES_COLLECTION,
  USER_INTEGRATIONS_SEGMENT,
} from '../config/future-tenant-collections.js'
import { readStoredTenantHostnameFromUserDoc } from '../utils/read-stored-tenant-hostname.js'
import {
  buildClientPayloadFromFirestore,
  type OnboardingProgressPayload,
  type UserOnboardingDoc,
} from '../app/onboarding-progress.js'

export async function loadOnboardingStateForApi(params: {
  usersCollection: string
  uid: string
  userDoc: Record<string, unknown> | null
}): Promise<OnboardingProgressPayload> {
  const snap = await admin
    .firestore()
    .collection(params.usersCollection)
    .doc(params.uid)
    .collection(USER_INTEGRATIONS_SEGMENT)
    .get()

  const integrationProviderIds = snap.docs.map((d) => d.id)
  const integrationStatuses: Record<string, string> = {}
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>
    const st = data.status
    integrationStatuses[d.id] =
      typeof st === 'string' && st.length > 0 ? st : 'unknown'
  }

  return buildClientPayloadFromFirestore({
    userDoc: params.userDoc,
    integrationProviderIds,
    integrationStatuses,
  })
}

async function syncIntegrationStubs(
  usersCollection: string,
  uid: string,
  desiredProviderIds: string[]
): Promise<void> {
  const db = admin.firestore()
  const intCol = db
    .collection(usersCollection)
    .doc(uid)
    .collection(USER_INTEGRATIONS_SEGMENT)

  const existing = await intCol.get()
  const desiredSet = new Set(desiredProviderIds)
  const existingIds = new Set(existing.docs.map((d) => d.id))

  const toDelete = existing.docs.filter((d) => !desiredSet.has(d.id))
  const toCreate = desiredProviderIds.filter((id) => !existingIds.has(id))

  const CHUNK = 400
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const b = db.batch()
    for (const d of toDelete.slice(i, i + CHUNK)) {
      b.delete(d.ref)
    }
    await b.commit()
  }
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    const b = db.batch()
    for (const id of toCreate.slice(i, i + CHUNK)) {
      b.set(
        intCol.doc(id),
        {
          providerId: id,
          status: 'pending_oauth',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    }
    await b.commit()
  }
}

function onboardingDocFromPayload(onboarding: UserOnboardingDoc): Record<string, unknown> {
  return {
    currentStep: onboarding.currentStep,
    completedSteps: onboarding.completedSteps,
    updatedAt: onboarding.updatedAt,
    /** Legacy key removed — hostname lives in `tenantHostname` + `tenant_hosts`. */
    draftCustomDomain: FieldValue.delete(),
  }
}

/**
 * Persist parsed onboarding PUT into first-class Firestore fields:
 * `username`, `tenantHostname`, `tenant_hosts/{hostname}`, `tenant_usernames/{slug}`, `onboarding`,
 * `integrations/*`, clear legacy `onboardingProgress`.
 */
export async function persistOnboardingWizardState(params: {
  usersCollection: string
  uid: string
  parsed: OnboardingProgressPayload
}): Promise<void> {
  const db = admin.firestore()
  const userRef = db.collection(params.usersCollection).doc(params.uid)
  const usernameNext = params.parsed.username
  const t = params.parsed.updatedAt

  const onboardingDoc: UserOnboardingDoc = {
    currentStep: params.parsed.currentStep,
    completedSteps: params.parsed.completedSteps,
    updatedAt: t,
  }

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef)
    const existing = userSnap.exists
      ? (userSnap.data() as Record<string, unknown>)
      : {}

    const usernamePrev =
      typeof existing.username === 'string' && existing.username.length > 0
        ? existing.username.toLowerCase()
        : null

    const domainNext = params.parsed.customDomain
    const domainPrev = readStoredTenantHostnameFromUserDoc(existing)

    const entitlementsRaw = existing.entitlements
    const customDomainEntitled =
      entitlementsRaw &&
      typeof entitlementsRaw === 'object' &&
      !Array.isArray(entitlementsRaw) &&
      (entitlementsRaw as Record<string, unknown>).customDomain === false
        ? false
        : true

    if (domainNext && !customDomainEntitled) {
      throw new Error('custom_domain_not_entitled')
    }

    /**
     * Firestore requires every tx.get before any tx.set/delete/update.
     * We used to read the new username/host claim after deleting the old one, which
     * fails when both change in one request.
     */
    let oldUsernameSnap: DocumentSnapshot | null = null
    let newUsernameSnap: DocumentSnapshot | null = null
    let oldHostSnap: DocumentSnapshot | null = null
    let newHostSnap: DocumentSnapshot | null = null

    if (usernameNext !== usernamePrev) {
      if (usernamePrev) {
        oldUsernameSnap = await tx.get(
          db.collection(TENANT_USERNAMES_COLLECTION).doc(usernamePrev)
        )
      }
      if (usernameNext) {
        newUsernameSnap = await tx.get(
          db.collection(TENANT_USERNAMES_COLLECTION).doc(usernameNext)
        )
      }
    }

    if (domainNext !== domainPrev) {
      if (domainPrev) {
        oldHostSnap = await tx.get(db.collection(TENANT_HOSTS_COLLECTION).doc(domainPrev))
      }
      if (domainNext) {
        newHostSnap = await tx.get(db.collection(TENANT_HOSTS_COLLECTION).doc(domainNext))
      }
    }

    if (usernameNext !== usernamePrev) {
      if (usernamePrev && oldUsernameSnap) {
        if (oldUsernameSnap.exists && oldUsernameSnap.get('uid') === params.uid) {
          tx.delete(oldUsernameSnap.ref)
        }
      }
      if (usernameNext && newUsernameSnap) {
        if (newUsernameSnap.exists) {
          const owner = newUsernameSnap.get('uid')
          if (owner !== params.uid) {
            throw new Error('username_taken')
          }
        }
        tx.set(newUsernameSnap.ref, {
          uid: params.uid,
          claimedAt: FieldValue.serverTimestamp(),
        })
      }
    }

    if (domainNext !== domainPrev) {
      if (domainPrev && oldHostSnap) {
        if (oldHostSnap.exists && oldHostSnap.get('uid') === params.uid) {
          tx.delete(oldHostSnap.ref)
        }
      }
      if (domainNext && newHostSnap) {
        if (newHostSnap.exists) {
          const owner = newHostSnap.get('uid')
          if (owner !== params.uid) {
            throw new Error('hostname_taken')
          }
        }
        tx.set(newHostSnap.ref, {
          uid: params.uid,
          claimedAt: FieldValue.serverTimestamp(),
        })
      }
    }

    const userPatch: Record<string, unknown> = {
      onboarding: onboardingDocFromPayload(onboardingDoc),
      onboardingProgress: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (usernameNext) {
      userPatch.username = usernameNext
    } else if (usernamePrev && !usernameNext) {
      userPatch.username = FieldValue.delete()
    }

    if (domainNext) {
      userPatch.tenantHostname = domainNext
    } else if (domainPrev) {
      userPatch.tenantHostname = FieldValue.delete()
    }

    tx.set(userRef, userPatch, { merge: true })
  })

  await syncIntegrationStubs(
    params.usersCollection,
    params.uid,
    params.parsed.connectedProviderIds
  )
}
