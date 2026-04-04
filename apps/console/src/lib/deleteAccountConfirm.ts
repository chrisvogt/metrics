/** Must match exactly (after trim) to enable destructive account delete in Settings. */
export const DELETE_ACCOUNT_CONFIRM_PHRASE = 'I UNDERSTAND'

export function isDeleteAccountPhraseConfirmed(input: string): boolean {
  return input.trim() === DELETE_ACCOUNT_CONFIRM_PHRASE
}
