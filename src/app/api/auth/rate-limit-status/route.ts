import { NextRequest, NextResponse } from 'next/server'
import { getRateLimitStatus } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
    let ip = 'unknown'
    const xff = req.headers.get('x-forwarded-for')
    const xri = req.headers.get('x-real-ip')

    if (xff) {
        ip = xff.split(',')[0].trim()
    } else if (xri) {
        ip = xri
    }

    const status = getRateLimitStatus(ip)
    return NextResponse.json(status)
}
