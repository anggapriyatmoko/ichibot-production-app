'use server'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { syncAllToLaravel } from '@/app/actions/product'

/**
 * POST /api/sync-productions
 * Trigger bulk sync of all products to Laravel (administration.ichibot.id)
 * Requires admin authentication
 */
export async function POST() {
    try {
        const session = await getServerSession(authOptions) as { user?: { role?: string } } | null

        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, message: 'Unauthorized. Admin access required.' },
                { status: 401 }
            )
        }

        const result = await syncAllToLaravel()

        return NextResponse.json({
            success: true,
            message: `Sync completed: ${result.success}/${result.total} berhasil`,
            data: result
        })
    } catch (error) {
        console.error('Sync error:', error)
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Sync failed'
            },
            { status: 500 }
        )
    }
}
