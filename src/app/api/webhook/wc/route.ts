import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import fs from 'fs';

const SECRET_PRODUCT = process.env.WC_WEBHOOK_SECRET_PRODUCT_UPDATE;
const SECRET_ORDER = process.env.WC_WEBHOOK_SECRET_ORDER_CREATED;
// Fallback to legacy secret if specific ones aren't defined
const SECRET_LEGACY = process.env.WC_WEBHOOK_SECRET;

function debugLog(message: string, data?: any) {
    const time = new Date().toISOString();
    const logMsg = `[${time}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
    try {
        fs.appendFileSync('webhook-debug.log', logMsg);
    } catch (e) {}
    console.log(`[WC Webhook] ${message}`, data || '');
}

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-wc-webhook-signature');
        const topic = request.headers.get('x-wc-webhook-topic'); // e.g., 'product.updated', 'order.created'
        const event = request.headers.get('x-wc-webhook-event'); // e.g., 'updated', 'created', 'deleted'
        const resource = request.headers.get('x-wc-webhook-resource'); // e.g., 'product', 'order'
        const source = request.headers.get('x-wc-webhook-source');

        debugLog(`--- Incoming Webhook ---`);
        debugLog(`Resource: ${resource}, Topic: ${topic}, Event: ${event}`);
        debugLog(`Signature: ${signature}`);

        if (!signature) {
            debugLog('Missing signature');
            return new NextResponse('Missing signature', { status: 401 });
        }

        // Determine which secret to use based on the webhook resource
        let activeSecret = SECRET_LEGACY;
        if (resource === 'product' || topic?.startsWith('product.')) {
            activeSecret = SECRET_PRODUCT || SECRET_LEGACY;
        } else if (resource === 'order' || topic?.startsWith('order.')) {
            activeSecret = SECRET_ORDER || SECRET_LEGACY;
        }

        if (!activeSecret) {
            debugLog(`Missing Secret string in environment variables for resource: ${resource}`);
            return new NextResponse('Webhook secret not configured for this resource', { status: 500 });
        }

        // Validate HMAC-SHA256 signature
        const hash = crypto
            .createHmac('sha256', activeSecret)
            .update(rawBody, 'utf8')
            .digest('base64');

        if (hash !== signature) {
            debugLog(`Invalid signature. Expected: ${hash}, Got: ${signature}`);
            return new NextResponse('Invalid signature', { status: 401 });
        }

        let payload: any;
        try {
            payload = JSON.parse(rawBody);
        } catch (e) {
            debugLog('Invalid JSON payload');
            return new NextResponse('Invalid JSON payload', { status: 400 });
        }

        // ============================================
        // Handle Orders (Triggers stock re-sync)
        // ============================================
        if (resource === 'order' || topic?.startsWith('order.')) {
            debugLog(`Received Order Webhook for Order ID: ${payload.id}`);
            if (payload.line_items && Array.isArray(payload.line_items)) {
                // Dynamically import to avoid circular dependencies if any
                const { syncSingleStoreProduct } = await import('@/app/actions/store-product');
                
                for (const item of payload.line_items) {
                    const productId = item.variation_id || item.product_id;
                    const parentId = item.variation_id ? item.product_id : undefined;
                    
                    if (productId) {
                        try {
                            debugLog(`Auto-syncing product ID ${productId} from Order ${payload.id}`);
                            await syncSingleStoreProduct(productId, parentId);
                        } catch (e: any) {
                            debugLog(`Failed auto-sync for product ${productId}`, e.message);
                        }
                    }
                }
                revalidatePath('/store/product');
                revalidatePath('/store/low-stock');
            }
            return new NextResponse('OK', { status: 200 });
        }

        // ============================================
        // Handle Products
        // ============================================
        if (resource === 'product' || topic?.startsWith('product.')) {
            const wcId = payload.id;

            if (!wcId) {
                debugLog('Missing product ID in payload', Object.keys(payload));
                return new NextResponse('Invalid payload: Missing ID', { status: 400 });
            }

            debugLog(`Received ${topic} for product ID: ${wcId}, Stock: ${payload.stock_quantity}`);

            // Handle Product Deletion
            if (topic === 'product.deleted' || event === 'deleted') {
            try {
                await prisma.storeProduct.deleteMany({
                    where: { wcId }
                });
                console.log(`[WC Webhook] Successfully deleted product ID: ${wcId} from local DB based on WooCommerce webhook`);
                
                // Revalidate related store paths
                revalidatePath('/store/product');
                revalidatePath('/store/low-stock');
                revalidatePath('/store/purchased');
            } catch (delError: any) {
                console.error(`[WC Webhook] Failed to delete product ID ${wcId}:`, delError.message);
            }
            return new NextResponse('OK', { status: 200 });
        }

        // Handle Product Creation / Update
        if (topic === 'product.updated' || topic === 'product.created' || event === 'updated' || event === 'created') {
            const parentId = payload.parent_id ? payload.parent_id : null;
            
            // Extract backupGudang from meta_data
            const backupGudang = payload.meta_data?.find(
                (m: any) => m.key === 'backup_gudang' || m.key === '_pos_barcode' || m.key === '_barcode' || m.key === 'barcode'
            )?.value?.toString() || null;
            
            // Unify image payload
            const images = payload.images ? payload.images : (payload.image ? [payload.image] : []);
            
            const dataToSet = {
                name: payload.name || `Variation #${wcId}`,
                slug: payload.slug || '',
                sku: payload.sku || null,
                type: payload.type || (parentId ? 'variation' : 'simple'),
                status: payload.status || 'publish',
                description: payload.description || '',
                shortDescription: payload.short_description || '',
                price: parseFloat(payload.price) || 0,
                regularPrice: parseFloat(payload.regular_price) || 0,
                salePrice: parseFloat(payload.sale_price) || 0,
                stockQuantity: payload.stock_quantity === null ? 0 : (parseInt(payload.stock_quantity) || 0),
                stockStatus: payload.stock_status || 'instock',
                weight: parseFloat(payload.weight) || 0,
                images: JSON.stringify(images),
                categories: JSON.stringify(payload.categories || []),
                attributes: JSON.stringify(payload.attributes || []),
                backupGudang: backupGudang,
                parentId: parentId || null,
                isMissingFromWoo: false,
                updatedAt: new Date()
            };

            // Anti-Loop Feature: Check if incoming data exactly matches our DB
            const existingProduct = await prisma.storeProduct.findUnique({
                where: { wcId }
            });

            let shouldUpdate = true;
            if (existingProduct) {
                const isIdentical = 
                    existingProduct.name === dataToSet.name &&
                    existingProduct.sku === dataToSet.sku &&
                    existingProduct.stockQuantity === dataToSet.stockQuantity &&
                    existingProduct.price === dataToSet.price &&
                    existingProduct.regularPrice === dataToSet.regularPrice &&
                    existingProduct.salePrice === dataToSet.salePrice &&
                    existingProduct.backupGudang === dataToSet.backupGudang &&
                    existingProduct.status === dataToSet.status &&
                    existingProduct.description === dataToSet.description &&
                    existingProduct.shortDescription === dataToSet.shortDescription &&
                    existingProduct.type === dataToSet.type;

                if (isIdentical) {
                    shouldUpdate = false;
                    console.log(`[WC Webhook] Product ID: ${wcId} is identical. Skipping database update to prevent redundant writes.`);
                }
            }

            if (shouldUpdate) {
                // Determine `purchased` flag: preserve if it exists, otherwise false
                const purchasedStatus = existingProduct ? existingProduct.purchased : false;

                await prisma.storeProduct.upsert({
                    where: { wcId },
                    update: dataToSet,
                    create: {
                        ...dataToSet,
                        wcId,
                        purchased: purchasedStatus
                    }
                });
                console.log(`[WC Webhook] Upserted product ID: ${wcId} successfully`);
                
                revalidatePath('/store/product');
                revalidatePath('/store/low-stock');
                revalidatePath('/store/purchased');
            }

            return new NextResponse('OK', { status: 200 });
        }
        } // close resource === 'product'

        // Return OK for unrecognized topics to satisfy WooCommerce
        debugLog(`Unhandled topic: ${topic} / event: ${event}`);
        return new NextResponse('Topic unhandled', { status: 200 });

    } catch (error: any) {
        debugLog('Internal Error:', error.message);
        return new NextResponse(`Internal Webhook Error`, { status: 500 });
    }
}
