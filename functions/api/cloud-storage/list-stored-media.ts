import { getMediaStore } from '../../selectors/media-store.js'

const listStoredMedia = async () => getMediaStore().listFiles()

export default listStoredMedia
