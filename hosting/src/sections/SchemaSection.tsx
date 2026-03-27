import { useAuth } from '../auth/AuthContext'
import styles from './SchemaSection.module.css'

const WIDGETS = ['discogs', 'flickr', 'github', 'goodreads', 'instagram', 'spotify', 'steam'] as const
const SYNC = ['spotify', 'steam', 'goodreads', 'instagram', 'discogs', 'flickr'] as const

export function SchemaSection() {
  const { user } = useAuth()

  return (
    <>
      <div className={styles.hero}>
        <h1 className={styles.title}>API schema</h1>
        <p className={styles.lead}>
          {user ? (
            <>
              Public widget reads, sync triggers, session helpers, and authenticated account routes exposed by
              the Cloud Functions app. All paths are rooted at <code className={styles.inlineCode}>/api</code>.
            </>
          ) : (
            <>
              Public widget reads for the metrics site. All paths are rooted at{' '}
              <code className={styles.inlineCode}>/api</code>.{' '}
              <span className={styles.leadMuted}>Sign in to see sync, auth, and account routes.</span>
            </>
          )}
        </p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Widget content</h2>
        <p className={styles.sectionText}>
          Cached JSON for the personal metrics site. Responses are wrapped as{' '}
          <code className={styles.inlineCode}>{`{ ok: true, payload }`}</code> on success.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {WIDGETS.map((id) => (
                <tr key={id}>
                  <td>
                    <span className={styles.methodGet}>GET</span>
                  </td>
                  <td>
                    <code className={styles.path}>/api/widgets/{id}</code>
                  </td>
                  <td className={styles.notes}>Public; CDN-friendly cache headers.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {user ? (
        <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Sync (manual trigger)</h2>
        <p className={styles.sectionText}>
          Enqueues provider sync work. Intended for operator use; avoid polling these from the Status page.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {SYNC.map((id) => (
                <tr key={id}>
                  <td>
                    <span className={styles.methodGet}>GET</span>
                  </td>
                  <td>
                    <code className={styles.path}>/api/widgets/sync/{id}</code>
                  </td>
                  <td className={styles.notes}>Runs queue-backed sync for the provider.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Auth &amp; session</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className={styles.methodPost}>POST</span>
                </td>
                <td>
                  <code className={styles.path}>/api/auth/session</code>
                </td>
                <td className={styles.notes}>
                  <code className={styles.inlineCode}>Authorization: Bearer &lt;Firebase ID token&gt;</code>
                  — sets HTTP-only session cookie.
                </td>
              </tr>
              <tr>
                <td>
                  <span className={styles.methodPost}>POST</span>
                </td>
                <td>
                  <code className={styles.path}>/api/auth/logout</code>
                </td>
                <td className={styles.notes}>Authenticated; revokes refresh tokens and clears session cookie.</td>
              </tr>
              <tr>
                <td>
                  <span className={styles.methodGet}>GET</span>
                </td>
                <td>
                  <code className={styles.path}>/api/client-auth-config</code>
                </td>
                <td className={styles.notes}>Firebase web client config for the admin UI.</td>
              </tr>
              <tr>
                <td>
                  <span className={styles.methodGet}>GET</span>
                </td>
                <td>
                  <code className={styles.path}>/api/firebase-config</code>
                </td>
                <td className={styles.notes}>Alias of client auth config.</td>
              </tr>
              <tr>
                <td>
                  <span className={styles.methodGet}>GET</span>
                </td>
                <td>
                  <code className={styles.path}>/api/csrf-token</code>
                </td>
                <td className={styles.notes}>CSRF token for mutating requests that require it.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>User (authenticated)</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className={styles.methodGet}>GET</span>
                </td>
                <td>
                  <code className={styles.path}>/api/user/profile</code>
                </td>
                <td className={styles.notes}>Session cookie or Bearer ID token.</td>
              </tr>
              <tr>
                <td>
                  <span className={styles.methodDel}>DELETE</span>
                </td>
                <td>
                  <code className={styles.path} style={{ whiteSpace: 'nowrap' }}>
                    /api/user/account
                  </code>
                </td>
                <td className={styles.notes}>Deletes Firebase user and related data.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
        </>
      ) : null}
    </>
  )
}
