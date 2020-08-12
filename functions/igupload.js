/**
 * This is a spike into uploading Instagram images to GCP, and ultimately to be
 * served by imgix through my own subdomain.
 */

const fs = require('fs')
const https = require('https')
const { Storage } = require('@google-cloud/storage')

// const serviceKey = require('./personal-stats-chrisvogt-9a0a4d932bfb-imgix.json');

const storage = new Storage({ keyFilename: './personal-stats-chrisvogt-9a0a4d932bfb-imgix.json' })
const bucketName = 'img.chrisvogt.me'

// See: https://github.com/googleapis/nodejs-storage/blob/master/samples/uploadFile.js
async function uploadFile(mediaURL) {
  console.log(`About to upload ${mediaURL}`)
  try {
    const result = await storage.bucket(bucketName).upload(mediaURL, {
      // Support for HTTP requests made with `Accept-Encoding: gzip`
      gzip: true,
      // By setting the option `destination`, you can change the name of the
      // object you are uploading to a bucket.
      metadata: {
        // Enable long-lived HTTP caching headers
        // Use only if the contents of the file will never change
        // (If the contents will change, use cacheControl: 'no-cache')
        cacheControl: 'public, max-age=31536000',
      },
    })
    console.log('The result is', result);
  } catch (error) {
    console.log('The error is', error);
  }


  // console.log(`${filename} uploaded to ${bucketName}.`)
}

async function downloadFile(url, destination) {
  const file = fs.createWriteStream(destination)
  const request = await https.get(url, (response) => {
    response.pipe(file)
  })
  console.log('success download', request)
  return 'success'
}

const experiment = {
  // TODO: this base path must exist, otherwise an error will occur
  destinationPathBase: './ig/',
  id: '17863864102997852',
  imageSource:
    'https://scontent.cdninstagram.com/v/t51.29350-15/116693785_622302791728619_4995074927815517978_n.jpg?_nc_cat=105&_nc_sid=8ae9d6&_nc_ohc=t30IlL4jYNQAX8OvJLP&_nc_ht=scontent.cdninstagram.com&oh=a732c57bf94d559b53959a3e59c0a3a7&oe=5F525085',
}

;(async () => {
  // try {
  //   await downloadFile(experiment.imageSource, `${experiment.destinationPathBase}${experiment.id}.jpg`)
  //   console.log(`Successfully downloaded an image for ${experiment.id}`)
  // } catch (error) {
  //   console.error(`Failed to download an image for ${experiment.id}`)
  // }

  // try {
  //   // TODO: determine how to define the file extension
  //   await uploadFile(`${experiment.destinationPathBase}${experiment.id}.jpg`)
  //   // console.log(`Successfully uploaded ${experiment.id} to GCP.`)
  // } catch (error) {
  //   console.error(`Failed to upload to GCP.`, error)
  // }
})()
