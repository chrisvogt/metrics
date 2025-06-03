import { describe, it, expect } from 'vitest'

// Import the functions we want to test
const { buildSuccessResponse, buildFailureResponse } = require('./index.js')

describe('Response Builders', () => {
  describe('buildSuccessResponse', () => {
    it('should create a success response with payload', () => {
      const payload = { data: 'test data' }
      const response = buildSuccessResponse(payload)
      
      expect(response).toEqual({
        ok: true,
        payload: { data: 'test data' }
      })
    })
  })

  describe('buildFailureResponse', () => {
    it('should create a failure response with error message string', () => {
      const error = 'Something went wrong'
      const response = buildFailureResponse(error)
      
      expect(response).toEqual({
        ok: false,
        error: 'Something went wrong'
      })
    })

    it('should create a failure response with error object', () => {
      const error = new Error('Something went wrong')
      const response = buildFailureResponse(error)
      
      expect(response).toEqual({
        ok: false,
        error: 'Something went wrong'
      })
    })

    it('should handle undefined error', () => {
      const response = buildFailureResponse()
      
      expect(response).toEqual({
        ok: false,
        error: undefined
      })
    })
  })
}) 