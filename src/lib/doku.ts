import crypto from 'crypto'

const DOKU_SANDBOX_URL = 'https://api-sandbox.doku.com'
const DOKU_PRODUCTION_URL = 'https://api.doku.com'

export const DOKU_CHECKOUT_PATH = '/checkout/v1/payment'
export const DOKU_STATUS_PATH = '/orders/v1/status/'

export function getDokuBaseUrl(): string {
    return process.env.DOKU_ENV === 'production' ? DOKU_PRODUCTION_URL : DOKU_SANDBOX_URL
}

/**
 * Generate Base64(SHA-256(body)) digest for POST requests
 */
export function generateDigest(jsonBody: string): string {
    const hash = crypto.createHash('sha256').update(jsonBody, 'utf-8').digest()
    return Buffer.from(hash).toString('base64')
}

/**
 * Generate HMAC-SHA256 signature for DOKU API
 * Component string format (POST):
 *   Client-Id:{val}\nRequest-Id:{val}\nRequest-Timestamp:{val}\nRequest-Target:{path}\nDigest:{digest}
 * For GET requests, omit the Digest line.
 */
export function generateSignature(params: {
    clientId: string
    requestId: string
    requestTimestamp: string
    requestTarget: string
    digest?: string
    secretKey: string
}): string {
    let componentSignature = `Client-Id:${params.clientId}`
    componentSignature += `\nRequest-Id:${params.requestId}`
    componentSignature += `\nRequest-Timestamp:${params.requestTimestamp}`
    componentSignature += `\nRequest-Target:${params.requestTarget}`

    if (params.digest) {
        componentSignature += `\nDigest:${params.digest}`
    }

    const hmac = crypto.createHmac('sha256', params.secretKey).update(componentSignature).digest()
    return `HMACSHA256=${Buffer.from(hmac).toString('base64')}`
}

/**
 * Generate all required DOKU headers for an API request
 */
export function generateRequestHeaders(params: {
    requestTarget: string
    body?: object
}): Record<string, string> {
    const clientId = process.env.Client_ID
    const secretKey = process.env.Active_Secret_Key

    if (!clientId || !secretKey) {
        throw new Error('DOKU credentials not configured (Client_ID or Active_Secret_Key missing)')
    }

    const requestId = crypto.randomUUID()
    const requestTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

    let digest: string | undefined
    if (params.body) {
        digest = generateDigest(JSON.stringify(params.body))
    }

    const signature = generateSignature({
        clientId,
        requestId,
        requestTimestamp,
        requestTarget: params.requestTarget,
        digest,
        secretKey,
    })

    return {
        'Client-Id': clientId,
        'Request-Id': requestId,
        'Request-Timestamp': requestTimestamp,
        'Signature': signature,
        'Content-Type': 'application/json',
    }
}

/**
 * Verify DOKU webhook notification signature
 */
export function verifyDokuSignature(params: {
    clientId: string
    requestId: string
    requestTimestamp: string
    requestTarget: string
    rawBody: string
    receivedSignature: string
}): boolean {
    const secretKey = process.env.Active_Secret_Key
    if (!secretKey) return false

    const digest = generateDigest(params.rawBody)
    const expectedSignature = generateSignature({
        clientId: params.clientId,
        requestId: params.requestId,
        requestTimestamp: params.requestTimestamp,
        requestTarget: params.requestTarget,
        digest,
        secretKey,
    })

    return expectedSignature === params.receivedSignature
}
