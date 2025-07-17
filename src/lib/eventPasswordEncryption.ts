/**
 * Event password encryption using event code as key
 * This approach uses the event code as the encryption key for simplicity
 * while still providing basic security for event passwords.
 */

function encryptWithEventCode(password: string, eventCode: string): string {
  let result = ''
  for (let i = 0; i < password.length; i++) {
    result += String.fromCharCode(
      password.charCodeAt(i) ^ eventCode.charCodeAt(i % eventCode.length)
    )
  }
  return btoa(result) // Base64 encode
}

function decryptWithEventCode(encryptedPassword: string, eventCode: string): string {
  try {
    const decoded = atob(encryptedPassword) // Base64 decode
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ eventCode.charCodeAt(i % eventCode.length)
      )
    }
    return result
  } catch {
    return ''
  }
}

/**
 * Encrypt event password using event code
 */
export function encryptEventPassword(password: string, eventCode: string): string {
  return encryptWithEventCode(password, eventCode)
}

/**
 * Decrypt event password using event code
 */
export function decryptEventPassword(encryptedPassword: string, eventCode: string): string {
  return decryptWithEventCode(encryptedPassword, eventCode)
}

/**
 * Verify event password by decrypting and comparing
 */
export function verifyEventPassword(inputPassword: string, encryptedPassword: string, eventCode: string): boolean {
  const decryptedPassword = decryptEventPassword(encryptedPassword, eventCode)
  return inputPassword === decryptedPassword
}