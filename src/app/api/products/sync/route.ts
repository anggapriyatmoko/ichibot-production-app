import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSystemSetting } from '@/app/actions/system-settings'
import { downloadExternalImage } from '@/lib/upload'

interface SyncBody {
    action: 'create' | 'update' | 'delete'
    id: string | number
    data?: {
        name: string
        sku?: string | null
        stock?: string | number
        low_stock_threshold?: string | number
        notes?: string | null
        drawer_location?: string | null
        image?: string | null
    }
}

/**
 * API Route for incoming synchronization from Laravel CI-Generate
 * Method: POST
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as SyncBody
        const { action, id, data } = body

        // Internal API Key check (from settings instead of ENV)
        const apiKey = req.headers.get('X-API-Key')
        const internalApiKey = await getSystemSetting('INTERNAL_API_KEY')

        if (internalApiKey && apiKey !== internalApiKey) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
        }

        const productId = String(id)

        if (action === 'create' || action === 'update') {
            if (!data) {
                return NextResponse.json({ success: false, message: 'Missing data for create/update' }, { status: 400 })
            }

            const productData = {
                name: data.name,
                sku: data.sku || null,
                stock: typeof data.stock === 'string' ? parseFloat(data.stock) : (Number(data.stock) || 0),
                lowStockThreshold: typeof data.low_stock_threshold === 'string' ? parseFloat(data.low_stock_threshold) : (Number(data.low_stock_threshold) || 0),
                notes: data.notes || '',
                drawerLocation: data.drawer_location || null,
                image: undefined as string | undefined | null
            }

            if (data.image && data.image.startsWith('http')) {
                const downloadedImage = await downloadExternalImage(data.image);
                if (downloadedImage) {
                    productData.image = downloadedImage;
                }
            } else if (data.image === null) {
                productData.image = null;
            }

            // Sync using external_id (which is Laravel's ID if we want)
            // Or use SKU as the unique identifier
            const existing = await prisma.product.findFirst({
                where: {
                    OR: [
                        { sku: data.sku ? data.sku : undefined },
                        { id: productId }
                    ]
                }
            })

            if (existing) {
                await prisma.product.update({
                    where: { id: existing.id },
                    data: productData
                })
            } else {
                await prisma.product.create({
                    data: {
                        ...productData,
                        id: productId
                    }
                })
            }
        } else if (action === 'delete') {
            await prisma.product.deleteMany({
                where: {
                    OR: [
                        { id: productId },
                        { sku: data?.sku ? data.sku : undefined }
                    ]
                }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        console.error('Sync API Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
    }
}
