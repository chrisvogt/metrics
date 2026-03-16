import type { DocumentStore } from '../ports/document-store.js'
import syncFlickrDataService from '../services/sync/sync-flickr-data.js'

const syncFlickrData = async (documentStore: DocumentStore) =>
  syncFlickrDataService(documentStore)

export default syncFlickrData
