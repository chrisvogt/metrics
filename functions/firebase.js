const admin = require('firebase-admin')

const firebaseServiceAccountToken = require('./token.json')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseServiceAccountToken),
    databaseURL: 'https://personal-stats-chrisvogt.firebaseio.com',
  })

  admin.firestore().settings({
    // Firestore settings
    ignoreUndefinedProperties: true,
  })
}

const db = admin.firestore()

module.exports = { admin, db }
