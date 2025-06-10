const functionsTest = require('firebase-functions-test')()
const admin = require('firebase-admin')
const { vi } = require('vitest')

// Initialize the admin app with a mock project
const mockApp = admin.initializeApp({
  projectId: 'demo-project'
})

// Mock Firestore methods
const mockFirestore = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn()
    }))
  }))
}

// Replace admin.firestore() with our mock
vi.spyOn(admin, 'firestore').mockImplementation(() => mockFirestore)

module.exports = {
  functionsTest,
  mockApp,
  mockFirestore,
  admin
} 