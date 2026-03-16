import { storeRemoteMedia } from '../../services/media/media-service.js'

const fetchAndUploadFile = ({ destinationPath, mediaURL, id }) =>
  storeRemoteMedia({ destinationPath, mediaURL, id })

export default fetchAndUploadFile
