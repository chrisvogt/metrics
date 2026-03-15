import { getMediaStore } from '../../selectors/media-store.js'

const fetchAndUploadFile = ({ destinationPath, mediaURL, id }) =>
  getMediaStore().fetchAndStore({ destinationPath, mediaURL, id })

export default fetchAndUploadFile
