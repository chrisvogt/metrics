import { FirestoreStorageAdapter } from '../adapters/storage/firestore-storage.js'
import type { StoragePort } from '../ports/storage.js'
import syncFlickrDataService from '../services/sync/sync-flickr-data.js'

const defaultStorage = new FirestoreStorageAdapter()

const syncFlickrData = async (storage: StoragePort = defaultStorage) =>
  syncFlickrDataService(storage)

export default syncFlickrData
