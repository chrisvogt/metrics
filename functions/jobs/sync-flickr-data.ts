import { FirestoreDocumentStore } from '../adapters/storage/firestore-document-store.js'
import type { DocumentStore } from '../ports/document-store.js'
import syncFlickrDataService from '../services/sync/sync-flickr-data.js'

const defaultDocumentStore = new FirestoreDocumentStore()

const syncFlickrData = async (documentStore: DocumentStore = defaultDocumentStore) =>
  syncFlickrDataService(documentStore)

export default syncFlickrData
