'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Fetch products from WooCommerce API
 * Includes 'status=any' to get drafts and private products if needed
 */
async function fetchWooCommerceProducts() {
    const WC_URL = process.env.NEXT_PUBLIC_WC_URL
    const WC_KEY = process.env.WC_CONSUMER_KEY
    const WC_SECRET = process.env.WC_CONSUMER_SECRET

    console.log('Fetching products from WooCommerce...');

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        console.error('Missing credentials:', {
            WC_URL: !!WC_URL,
            WC_KEY: !!WC_KEY,
            WC_SECRET: !!WC_SECRET
        });
        throw new Error('WooCommerce API credentials are not configured in .env')
    }

    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
    let allProducts: any[] = []
    let page = 1
    const perPage = 100

    // Standardize URL to remove trailing slash if exists
    const baseUrl = WC_URL.replace(/\/$/, '')
    console.log(`Using base URL: ${baseUrl}`);

    while (true) {
        // status=any included to fetch all products regardless of publishing status
        const url = `${baseUrl}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}&status=any`;
        console.log(`Fetching page ${page}: ${url}`);

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Basic ${auth}`
                },
                next: { revalidate: 0 },
                signal: AbortSignal.timeout(30000) // Increased timeout to 30s
            })

            console.log(`Response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error details:', errorData);
                throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}. ${errorData.message || ''}`)
            }

            const products = await response.json()
            console.log(`Received ${Array.isArray(products) ? products.length : 'non-array'} products.`);

            if (!Array.isArray(products) || products.length === 0) break

            allProducts = [...allProducts, ...products]
            if (products.length < perPage) break
            page++
        } catch (fetchError: any) {
            console.error(`Error during fetch (page ${page}):`, fetchError.message);
            throw fetchError;
        }
    }

    return allProducts
}

export async function syncStoreProducts() {
    console.log('Starting syncStoreProducts...');
    try {
        const wcProducts = await fetchWooCommerceProducts();
        console.log(`Total items fetched from WooCommerce: ${wcProducts.length}`);

        if (wcProducts.length === 0) {
            console.log('No products found in WooCommerce.');
            return { success: true, count: 0 };
        }

        // Process each product
        let syncedCount = 0;
        let errorCount = 0;
        const fetchedWcIds: number[] = [];

        for (const product of wcProducts) {
            fetchedWcIds.push(product.id);
            try {
                await prisma.storeProduct.upsert({
                    where: { wcId: product.id },
                    update: {
                        name: product.name,
                        slug: product.slug,
                        sku: product.sku,
                        type: product.type,
                        status: product.status,
                        description: product.description,
                        shortDescription: product.short_description,
                        price: parseFloat(product.price) || 0,
                        regularPrice: parseFloat(product.regular_price) || 0,
                        salePrice: parseFloat(product.sale_price) || 0,
                        stockQuantity: product.stock_quantity || 0,
                        stockStatus: product.stock_status,
                        images: JSON.stringify(product.images),
                        categories: JSON.stringify(product.categories),
                        updatedAt: new Date(),
                        isMissingFromWoo: false, // Reset if found
                        // DO NOT update 'purchased' or 'storeName' during sync to preserve local edits
                    },
                    create: {
                        wcId: product.id,
                        name: product.name,
                        slug: product.slug,
                        sku: product.sku,
                        type: product.type,
                        status: product.status,
                        description: product.description,
                        shortDescription: product.short_description,
                        price: parseFloat(product.price) || 0,
                        regularPrice: parseFloat(product.regular_price) || 0,
                        salePrice: parseFloat(product.sale_price) || 0,
                        stockQuantity: product.stock_quantity || 0,
                        stockStatus: product.stock_status,
                        images: JSON.stringify(product.images),
                        categories: JSON.stringify(product.categories),
                        purchased: false,
                        isMissingFromWoo: false,
                    }
                });
                syncedCount++;
            } catch (upsertError: any) {
                errorCount++;
                console.error(`Failed to upsert product ID ${product.id} (${product.name}):`, upsertError.message);
            }
        }

        // Mark products as missing if they were not in the fetched list
        if (fetchedWcIds.length > 0) {
            await prisma.storeProduct.updateMany({
                where: {
                    wcId: { notIn: fetchedWcIds },
                    isMissingFromWoo: false
                },
                data: {
                    isMissingFromWoo: true
                }
            });
        }

        console.log(`Sync complete. Success: ${syncedCount}, Errors: ${errorCount}`);

        try {
            revalidatePath('/store/product')
            revalidatePath('/store/low-stock')
            revalidatePath('/store/purchased')
        } catch (e) {
            console.log('revalidatePath skipped (non-next context)');
        }

        return {
            success: true,
            count: syncedCount,
            errors: errorCount,
            total: wcProducts.length
        };
    } catch (error: any) {
        console.error('Critical sync error:', error.message);
        return { success: false, error: error.message };
    }
}

export async function getStoreProducts() {
    try {
        const products = await prisma.storeProduct.findMany({
            orderBy: [
                { purchased: 'asc' },
                { wcId: 'desc' }
            ]
        })
        return products.map((p: any) => {
            let images = [];
            let categories = [];
            try {
                if (p.images) images = JSON.parse(p.images);
            } catch (e) {
                console.error(`Invalid images JSON for product ${p.wcId}:`, p.images);
            }
            try {
                if (p.categories) categories = JSON.parse(p.categories);
            } catch (e) {
                console.error(`Invalid categories JSON for product ${p.wcId}:`, p.categories);
            }
            return {
                ...p,
                images,
                categories
            };
        })
    } catch (error) {
        console.error('Error fetching products from DB:', error)
        return []
    }
}

export async function getStoreLowStockProducts() {
    try {
        const products = await prisma.storeProduct.findMany({
            where: {
                purchased: false
            },
            orderBy: { stockQuantity: 'asc' }
        })
        return products.map((p: any) => {
            let images = [];
            let categories = [];
            try {
                if (p.images) images = JSON.parse(p.images);
            } catch (e) {
                console.error(`Invalid images JSON for product ${p.wcId}:`, p.images);
            }
            try {
                if (p.categories) categories = JSON.parse(p.categories);
            } catch (e) {
                console.error(`Invalid categories JSON for product ${p.wcId}:`, p.categories);
            }
            return {
                ...p,
                images,
                categories
            };
        })
    } catch (error) {
        console.error('Error fetching low stock products from DB:', error)
        return []
    }
}

export async function toggleStoreProductPurchased(wcId: number, purchased: boolean) {
    try {
        await prisma.storeProduct.update({
            where: { wcId },
            data: {
                purchased,
                purchasedAt: purchased ? new Date() : null
            }
        })
        revalidatePath('/store/product')
        revalidatePath('/store/low-stock')
        revalidatePath('/store/purchased')
        return { success: true }
    } catch (error: any) {
        console.error('Error toggling purchased state:', error)
        return { success: false, error: error.message }
    }
}

export async function updateStoreProductName(wcId: number, storeName: string) {
    try {
        await prisma.storeProduct.update({
            where: { wcId },
            data: { storeName }
        })
        revalidatePath('/store/product')
        revalidatePath('/store/low-stock')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating store name:', error)
        return { success: false, error: error.message }
    }
}

export async function getStorePurchasedProducts() {
    try {
        const products = await prisma.storeProduct.findMany({
            where: {
                purchased: true
            },
            orderBy: { updatedAt: 'desc' }
        })
        return products.map((p: any) => {
            let images = [];
            let categories = [];
            try {
                if (p.images) images = JSON.parse(p.images);
            } catch (e) {
                console.error(`Invalid images JSON for product ${p.wcId}:`, p.images);
            }
            try {
                if (p.categories) categories = JSON.parse(p.categories);
            } catch (e) {
                console.error(`Invalid categories JSON for product ${p.wcId}:`, p.categories);
            }
            return {
                ...p,
                images,
                categories
            };
        })
    } catch (error) {
        console.error('Error fetching purchased products from DB:', error)
        return []
    }
}

export async function searchWooCommerceProducts(query: string, page: number = 1) {
    if (!query || query.trim().length === 0) return { products: [], totalPages: 0, totalItems: 0 }

    const WC_URL = process.env.NEXT_PUBLIC_WC_URL
    const WC_KEY = process.env.WC_CONSUMER_KEY
    const WC_SECRET = process.env.WC_CONSUMER_SECRET

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        console.error('WooCommerce API credentials are not configured')
        return { products: [], totalPages: 0, totalItems: 0 }
    }

    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
    const baseUrl = WC_URL.replace(/\/$/, '')
    const url = `${baseUrl}/wp-json/wc/v3/products?search=${encodeURIComponent(query)}&per_page=100&page=${page}&status=publish`

    console.log(`Searching WooCommerce API: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'User-Agent': 'Ichibot-Production-App/1.0',
                'Accept': 'application/json'
            },
            next: { revalidate: 0 },
            cache: 'no-store'
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error detail')
            console.error(`WooCommerce API Error (${response.status}):`, errorText)
            throw new Error(`Failed to search products: ${response.status} ${response.statusText}`)
        }

        const totalItems = parseInt(response.headers.get('X-WP-Total') || '0')
        const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0')
        const rawProducts = await response.json()

        const lowerQuery = query.toLowerCase()

        // Map and Sort products
        const products = rawProducts.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: parseFloat(p.price) || 0,
            regularPrice: parseFloat(p.regular_price) || 0,
            salePrice: parseFloat(p.sale_price) || 0,
            stockQuantity: p.stock_quantity || 0,
            image: p.images?.[0]?.src || null,
            images: p.images?.map((img: any) => img.src) || [],
            description: p.description || '',
            barcode: p.meta_data?.find((m: any) => m.key === 'backup_gudang' || m.key === '_pos_barcode' || m.key === '_barcode' || m.key === 'barcode')?.value || null,
            slug: p.slug
        })).sort((a: any, b: any) => {
            const aName = a.name.toLowerCase()
            const bName = b.name.toLowerCase()

            const aStarts = aName.startsWith(lowerQuery)
            const bStarts = bName.startsWith(lowerQuery)
            const aContains = aName.includes(lowerQuery)
            const bContains = bName.includes(lowerQuery)

            // 1. Priority: Starts with keyword
            if (aStarts && !bStarts) return -1
            if (!aStarts && bStarts) return 1

            // 2. Priority: Contains keyword (but doesn't start with it)
            if (aContains && !bContains) return -1
            if (!aContains && bContains) return 1

            // 3. Alphabetical fallback
            return aName.localeCompare(bName)
        })

        return {
            products,
            totalPages,
            totalItems
        }
    } catch (error: any) {
        console.error('Search error:', error.message)
        if (error.message.includes('fetch failed')) {
            console.error('Network error during WooCommerce API search. Check connection to store.ichibot.id')
        }
        return { products: [], totalPages: 0, totalItems: 0 }
    }
}
