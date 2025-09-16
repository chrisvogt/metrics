/**
 * Filters Discogs resource data to only include essential fields
 * This reduces document size while keeping the most valuable information
 * @param {Object} resourceData - Raw resource data from Discogs API
 * @returns {Object} Filtered resource data with only essential fields
 */
const filterDiscogsResource = (resourceData) => {
  if (!resourceData) return null

  // Define the fields we want to keep from the resource data
  const allowedFields = {
    // Basic release info
    id: true,
    title: true,
    year: true,
    country: true,
    released: true,
    released_formatted: true,
    status: true,
    data_quality: true,
    
    // Artists and credits
    artists: false,
    extraartists: false,
    
    // Labels and companies
    labels: false,
    companies: false,
    
    // Formats and tracklist
    formats: false,
    tracklist: true,
    
    // Genres and styles
    genres: true,
    styles: true,
    
    // Identifiers (barcodes, matrix numbers, etc.)
    identifiers: false,
    
    // Images (but limit to essential ones)
    images: false,
    
    // Notes
    notes: true,
    
    // URLs
    uri: true,
    resource_url: true,
    
    // Master info (if available)
    master_id: true,
    master_url: true,
    main_release: true,
    main_release_url: true
  }

  // Define allowed fields for nested objects (like tracklist items)
  const nestedAllowedFields = {
    // Common fields that should be allowed in nested objects
    position: true,
    title: true,
    duration: true,
    type: true,
    // Add other common fields as needed
  }

  // Recursively filter the object to only include allowed fields
  const filterObject = (obj, allowedFields, isNested = false) => {
    if (!obj || typeof obj !== 'object') return obj
    
    if (Array.isArray(obj)) {
      return obj.map(item => filterObject(item, allowedFields, true))
    }
    
    const filtered = {}
    const fieldsToCheck = isNested ? nestedAllowedFields : allowedFields
    
    for (const [key, value] of Object.entries(obj)) {
      if (fieldsToCheck[key] === true) {
        if (isNested) {
          // For nested objects, include the value as-is
          filtered[key] = value
        } else {
          // For top-level objects, recursively filter
          filtered[key] = filterObject(value, allowedFields, true)
        }
      }
    }
    return filtered
  }

  return filterObject(resourceData, allowedFields)
}

export default filterDiscogsResource
