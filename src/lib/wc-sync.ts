import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function syncSingleStoreProduct(wcId: number, parentId?: number) {

    const WC_URL = process.env.NEXT_PUBLIC_WC_URL;
    const WC_KEY = process.env.WC_CONSUMER_KEY;
    const WC_SECRET = process.env.WC_CONSUMER_SECRET;

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        return { success: false, error: 'WooCommerce API credentials are not configured' }
    }

    try {
        const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
        const baseUrl = WC_URL.replace(/\/$/, '');

        // Determine URL (product vs variation)
        let url = `${baseUrl}/wp-json/wc/v3/products/${wcId}`;
        if (parentId) {
            url = `${baseUrl}/wp-json/wc/v3/products/${parentId}/variations/${wcId}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${auth}`
            },
            next: { revalidate: 0 },
            cache: 'no-store'
        });

        if (!response.ok) {
            if (response.status === 404) {
                // Mark as missing if not found in WooCommerce
                await prisma.storeProduct.update({
                    where: { wcId },
                    data: { isMissingFromWoo: true }
                });
                return { success: false, error: 'Produk tidak ditemukan di WooCommerce (404)' }
            }
            throw new Error(`Failed to fetch product: ${response.statusText}`);
        }

        const product = await response.json();

        // Prepare data for upsert
        const productData: any = {
            name: parentId ? product.name || `Variation #${product.id}` : product.name,
            slug: product.slug,
            sku: product.sku,
            status: product.status,
            price: parseFloat(product.price) || 0,
            regularPrice: parseFloat(product.regular_price) || 0,
            salePrice: parseFloat(product.sale_price) || 0,
            stockQuantity: product.stock_quantity || 0,
            stockStatus: product.stock_status,
            weight: parseFloat(product.weight) || 0,
            images: JSON.stringify(product.images || (product.image ? [product.image] : [])),
            updatedAt: new Date(),
            isMissingFromWoo: false,
            backupGudang: product.meta_data?.find((m: any) => m.key === 'backup_gudang' || m.key === '_pos_barcode')?.value?.toString() || null,
        };

        if (!parentId) {
            productData.type = product.type;
            productData.description = product.description;
            productData.shortDescription = product.short_description;
            productData.categories = JSON.stringify(product.categories);
        } else {
            productData.type = 'variation';
            productData.parentId = parentId;
            productData.attributes = JSON.stringify(product.attributes);
        }

        const syncedProduct = await prisma.storeProduct.upsert({
            where: { wcId: product.id },
            update: {
                ...productData,
                updatedAt: new Date()
            },
            create: {
                ...productData,
                wcId: product.id,
                purchased: false
            }
        });

        // If variable product and NOT a variation itself, sync its variations too
        if (!parentId && product.type === 'variable') {
            const varUrl = `${baseUrl}/wp-json/wc/v3/products/${product.id}/variations?per_page=100&orderby=id&order=asc`;
            const varResponse = await fetch(varUrl, {
                headers: { 'Authorization': `Basic ${auth}` },
                next: { revalidate: 0 }
            });

            if (varResponse.ok) {
                const variations = await varResponse.json();
                for (const variation of variations) {
                    const varData = {
                        name: product.name,
                        slug: variation.slug,
                        sku: variation.sku,
                        type: 'variation',
                        status: variation.status,
                        price: parseFloat(variation.price) || 0,
                        regularPrice: parseFloat(variation.regular_price) || 0,
                        salePrice: parseFloat(variation.sale_price) || 0,
                        stockQuantity: variation.stock_quantity || 0,
                        stockStatus: variation.stock_status,
                        weight: parseFloat(variation.weight) || 0,
                        images: JSON.stringify(variation.image ? [variation.image] : []),
                        attributes: JSON.stringify(variation.attributes),
                        parentId: product.id,
                        updatedAt: new Date(),
                        isMissingFromWoo: false,
                        backupGudang: variation.meta_data?.find((m: any) => m.key === 'backup_gudang' || m.key === '_pos_barcode')?.value?.toString() || null,
                    };

                    await prisma.storeProduct.upsert({
                        where: { wcId: variation.id },
                        update: varData,
                        create: {
                            ...varData,
                            wcId: variation.id,
                            purchased: false
                        }
                    });
                }
            }
        }

        revalidatePath('/store/product');
        revalidatePath('/store/rack-management');
        revalidatePath('/store/purchased');
        revalidatePath('/store/pos');

        // Parse JSON fields for frontend consistency
        const result = {
            ...syncedProduct,
            images: [],
            categories: [],
            attributes: []
        };

        try { if (syncedProduct.images) result.images = JSON.parse(syncedProduct.images); } catch (e) { }
        try { if (syncedProduct.categories) result.categories = JSON.parse(syncedProduct.categories); } catch (e) { }
        try { if (syncedProduct.attributes) result.attributes = JSON.parse(syncedProduct.attributes); } catch (e) { }

        return { success: true, product: result };
    } catch (error: any) {
        console.error(`Error syncing product ${wcId}:`, error.message);
        return { success: false, error: error.message };
    }
}
