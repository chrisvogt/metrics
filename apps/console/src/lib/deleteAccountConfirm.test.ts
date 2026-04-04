import { describe, expect, it } from 'vitest'
import {
  DELETE_ACCOUNT_CONFIRM_PHRASE,
  isDeleteAccountPhraseConfirmed,
} from './deleteAccountConfirm.js'

describe('deleteAccountConfirm', () => {
  it('accepts exact phrase with surrounding whitespace trimmed', () => {
    expect(isDeleteAccountPhraseConfirmed('  I UNDERSTAND  ')).toBe(true)
  })

  it('rejects wrong case and wrong text', () => {
    expect(isDeleteAccountPhraseConfirmed('i understand')).toBe(false)
    expect(isDeleteAccountPhraseConfirmed('I understand')).toBe(false)
    expect(isDeleteAccountPhraseConfirmed('DELETE')).toBe(false)
    expect(isDeleteAccountPhraseConfirmed('')).toBe(false)
  })

  it('exports the expected phrase constant', () => {
    expect(DELETE_ACCOUNT_CONFIRM_PHRASE).toBe('I UNDERSTAND')
  })
})
