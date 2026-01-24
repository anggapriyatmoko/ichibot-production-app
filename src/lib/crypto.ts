import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
    const key = process.env.AUTH_KEY
    if (!key) {
        throw new Error('AUTH_KEY environment variable is not set')
    }
    // Ensure key is 32 bytes for AES-256
    return crypto.createHash('sha256').update(key).digest()
}

/**
 * Encrypt a string value using AES-256-GCM
 * Returns base64 encoded string: iv + authTag + encrypted
 */
export function encrypt(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value === '') {
        return null
    }

    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(value, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    // Combine: iv (16) + authTag (16) + encrypted data
    const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'base64')
    ])

    return combined.toString('base64')
}

/**
 * Decrypt a base64 encoded encrypted string.
 * Fallback to original value if decryption fails (handles legacy unencrypted data).
 */
export function decrypt(encryptedValue: string | null | undefined): string | null {
    if (encryptedValue === null || encryptedValue === undefined || encryptedValue === '') {
        return null
    }

    try {
        const key = getEncryptionKey()
        const combined = Buffer.from(encryptedValue, 'base64')

        // Minimum size: IV (16) + AuthTag (16) + at least 1 byte of data
        const MIN_ENCRYPTED_LENGTH = IV_LENGTH + AUTH_TAG_LENGTH + 1
        if (combined.length < MIN_ENCRYPTED_LENGTH) {
            return encryptedValue // Looks like plain text
        }

        // Extract components
        const iv = combined.subarray(0, IV_LENGTH)
        const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
        const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
        decipher.setAuthTag(authTag)

        let decrypted = decipher.update(encrypted)
        decrypted = Buffer.concat([decrypted, decipher.final()])

        return decrypted.toString('utf8')
    } catch (error: any) {
        // Fallback to original if it wasn't encrypted
        return encryptedValue
    }
}

/**
 * Encrypt a number value
 */
export function encryptNumber(value: number | null | undefined): string | null {
    if (value === null || value === undefined) return null
    return encrypt(value.toString())
}

/**
 * Decrypt to a number
 */
export function decryptNumber(encryptedValue: string | null | undefined): number | null {
    const decrypted = decrypt(encryptedValue)
    if (decrypted === null) return null
    const num = parseFloat(decrypted)
    return isNaN(num) ? null : num
}

/**
 * Encrypt a Date value - stores as ISO string encrypted
 */
export function encryptDate(date: Date | null | undefined): string | null {
    if (!date) return null
    return encrypt(date.toISOString())
}

/**
 * Decrypt to a Date value
 */
export function decryptDate(encryptedValue: string | null | undefined): Date | null {
    const decrypted = decrypt(encryptedValue)
    if (!decrypted) return null
    return new Date(decrypted)
}
