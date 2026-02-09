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
    const WC_URL = process.env.NEXT_PUBLIC_WC_URL
    const WC_KEY = process.env.WC_CONSUMER_KEY
    const WC_SECRET = process.env.WC_CONSUMER_SECRET

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        console.error('WooCommerce API credentials are not configured')
        return { success: false, error: 'WooCommerce API credentials are not configured' }
    }

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
                        isMissingFromWoo: false,
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

                // If variable product, fetch and sync variations
                if (product.type === 'variable') {
                    console.log(`Product ${product.id} is variable, fetching variations...`);
                    const baseUrl = WC_URL.replace(/\/$/, '');
                    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
                    const varUrl = `${baseUrl}/wp-json/wc/v3/products/${product.id}/variations?per_page=100`;
                    console.log(`Fetching variations for ${product.name} (ID: ${product.id}) from ${varUrl}`);

                    try {
                        const varResponse = await fetch(varUrl, {
                            headers: { 'Authorization': `Basic ${auth}` },
                            next: { revalidate: 0 }
                        });

                        if (varResponse.ok) {
                            const variations = await varResponse.json();
                            console.log(`Found ${variations.length} variations for product ${product.id}`);
                            if (variations.length === 0) {
                                console.log(`Warning: Product ${product.id} is variable but returned 0 variations.`);
                            }

                            for (const variation of variations) {
                                fetchedWcIds.push(variation.id);
                                await prisma.storeProduct.upsert({
                                    where: { wcId: variation.id },
                                    update: {
                                        name: product.name, // Parents name for base
                                        slug: variation.slug,
                                        sku: variation.sku,
                                        type: 'variation',
                                        status: variation.status,
                                        price: parseFloat(variation.price) || 0,
                                        regularPrice: parseFloat(variation.regular_price) || 0,
                                        salePrice: parseFloat(variation.sale_price) || 0,
                                        stockQuantity: variation.stock_quantity || 0,
                                        stockStatus: variation.stock_status,
                                        images: JSON.stringify(variation.image ? [variation.image] : []),
                                        attributes: JSON.stringify(variation.attributes),
                                        parentId: product.id,
                                        updatedAt: new Date(),
                                        isMissingFromWoo: false,
                                    },
                                    create: {
                                        wcId: variation.id,
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
                                        images: JSON.stringify(variation.image ? [variation.image] : []),
                                        attributes: JSON.stringify(variation.attributes),
                                        parentId: product.id,
                                        purchased: false,
                                        isMissingFromWoo: false,
                                    }
                                });
                                syncedCount++;
                            }
                        }
                    } catch (varError: any) {
                        console.error(`Error syncing variations for product ${product.id}:`, varError.message);
                    }
                }
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
            let attributes = [];
            try {
                if (p.attributes) attributes = JSON.parse(p.attributes);
            } catch (e) {
                console.error(`Invalid attributes JSON for product ${p.wcId}:`, p.attributes);
            }

            return {
                ...p,
                images,
                categories,
                attributes
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
            let attributes = [];
            try {
                if (p.attributes) attributes = JSON.parse(p.attributes);
            } catch (e) {
                console.error(`Invalid attributes JSON for product ${p.wcId}:`, p.attributes);
            }

            return {
                ...p,
                images,
                categories,
                attributes
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

export async function updateStoreProductKeterangan(wcId: number, keterangan: string) {
    try {
        await prisma.storeProduct.update({
            where: { wcId },
            data: { keterangan }
        })
        revalidatePath('/store/product')
        revalidatePath('/store/low-stock')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating keterangan:', error)
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
            let attributes = [];
            try {
                if (p.attributes) attributes = JSON.parse(p.attributes);
            } catch (e) {
                console.error(`Invalid attributes JSON for product ${p.wcId}:`, p.attributes);
            }

            return {
                ...p,
                images,
                categories,
                attributes
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

    // Parallel search URLs
    const searchUrl = `${baseUrl}/wp-json/wc/v3/products?search=${encodeURIComponent(query)}&per_page=100&page=${page}&status=publish`
    const skuUrl = `${baseUrl}/wp-json/wc/v3/products?sku=${encodeURIComponent(query)}&per_page=100&page=1&status=publish`

    console.log(`Searching WooCommerce API: ${searchUrl}`);

    try {
        const fetchOptions = {
            headers: {
                'Authorization': `Basic ${auth}`,
                'User-Agent': 'Ichibot-Production-App/1.0',
                'Accept': 'application/json'
            },
            next: { revalidate: 0 },
            cache: 'no-store' as RequestCache
        }

        // Fetch search results and (if page 1) SKU results in parallel
        const fetchPromises = [fetch(searchUrl, fetchOptions)]
        const shouldSearchSku = page === 1 && query.trim().length > 0
        if (shouldSearchSku) {
            console.log(`Searching WooCommerce API by SKU: ${skuUrl}`);
            fetchPromises.push(fetch(skuUrl, fetchOptions))
        }

        const responses = await Promise.all(fetchPromises)
        const response = responses[0] // Main search response

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error detail')
            console.error(`WooCommerce API Error (${response.status}):`, errorText)
            throw new Error(`Failed to search products: ${response.status} ${response.statusText}`)
        }

        const totalItems = parseInt(response.headers.get('X-WP-Total') || '0')
        const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0')
        const searchProducts = await response.json()

        let rawProducts = searchProducts

        // Merge SKU results if available
        if (responses[1] && responses[1].ok) {
            const skuProducts = await responses[1].json()
            if (Array.isArray(skuProducts) && skuProducts.length > 0) {
                // Dedup and put SKU results at the top
                const searchIds = new Set(searchProducts.map((p: any) => p.id))
                const uniqueSkuProducts = skuProducts.filter((p: any) => !searchIds.has(p.id))
                rawProducts = [...uniqueSkuProducts, ...searchProducts]
            }
        }

        const lowerQuery = query.toLowerCase()

        // Map and Sort products
        const products = rawProducts.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            type: p.type,
            attributes: p.attributes || [],
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
            const aSku = (a.sku || '').toLowerCase()
            const bSku = (b.sku || '').toLowerCase()

            // 1. Priority: Exact or Prefix SKU match
            const aSkuMatch = aSku.startsWith(lowerQuery)
            const bSkuMatch = bSku.startsWith(lowerQuery)
            if (aSkuMatch && !bSkuMatch) return -1
            if (!aSkuMatch && bSkuMatch) return 1

            // 2. Priority: Starts with keyword in Name
            const aStarts = aName.startsWith(lowerQuery)
            const bStarts = bName.startsWith(lowerQuery)
            if (aStarts && !bStarts) return -1
            if (!aStarts && bStarts) return 1

            // 3. Priority: Contains keyword in Name
            const aContains = aName.includes(lowerQuery)
            const bContains = bName.includes(lowerQuery)
            if (aContains && !bContains) return -1
            if (!aContains && bContains) return 1

            // 4. Alphabetical fallback
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

export async function getProductVariations(productId: number) {
    const WC_URL = process.env.NEXT_PUBLIC_WC_URL
    const WC_KEY = process.env.WC_CONSUMER_KEY
    const WC_SECRET = process.env.WC_CONSUMER_SECRET

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        console.error('WooCommerce API credentials are not configured')
        return []
    }

    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
    const baseUrl = WC_URL.replace(/\/$/, '')
    const url = `${baseUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'User-Agent': 'Ichibot-Production-App/1.0',
                'Accept': 'application/json'
            },
            next: { revalidate: 0 },
            cache: 'no-store' as RequestCache
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch variations: ${response.statusText}`)
        }

        const variations = await response.json()
        return variations.map((v: any) => ({
            id: v.id,
            name: v.name || `Variation #${v.id}`,
            sku: v.sku,
            type: 'variation',
            parentId: productId, // Add parentId
            attributes: v.attributes || [],
            price: parseFloat(v.price) || 0,
            regularPrice: parseFloat(v.regular_price) || 0,
            salePrice: parseFloat(v.sale_price) || 0,
            stockQuantity: v.stock_quantity || 0,
            image: v.image?.src || null,
            images: v.image ? [v.image.src] : [],
            description: v.description || '',
            barcode: v.meta_data?.find((m: any) => m.key === 'backup_gudang' || m.key === '_pos_barcode' || m.key === '_barcode' || m.key === 'barcode')?.value || null,
            slug: v.slug
        }))
    } catch (error) {
        console.error(`Error fetching variations for product ${productId}:`, error)
        return []
    }
}
