// Shared in-memory rate limit store (per server process)
export const rateLimitStore = new Map<string, { attempts: number, blockedUntil: number }>()

export function getRateLimitStatus(ip: string): { isLocked: boolean, remainingSeconds: number } {
    const record = rateLimitStore.get(ip)
    if (!record) return { isLocked: false, remainingSeconds: 0 }

    const now = Date.now()
    if (now < record.blockedUntil) {
        const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000)
        return { isLocked: true, remainingSeconds }
    }

    // Block expired, cleanup
    if (record.blockedUntil !== 0 && now > record.blockedUntil) {
        rateLimitStore.delete(ip)
    }

    return { isLocked: false, remainingSeconds: 0 }
}
