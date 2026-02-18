import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

const RBAC_KEY = 'RBAC_CONFIG'

/**
 * GET /api/rbac
 * Returns the decrypted RBAC config as JSON.
 * Used by middleware (Edge runtime can't call Prisma directly).
 */
export async function GET() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: RBAC_KEY }
        })

        if (!setting) {
            return NextResponse.json({ config: null })
        }

        const decrypted = decrypt(setting.value)
        if (!decrypted) {
            return NextResponse.json({ config: null })
        }

        const config = JSON.parse(decrypted)
        return NextResponse.json({ config })
    } catch (error) {
        console.error('Error fetching RBAC config:', error)
        return NextResponse.json({ config: null })
    }
}
