'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

/**
 * Helper to get the upload directory
 */
function getUploadDir() {
    let uploadDir = process.env.UPLOAD_DIR
    if (!uploadDir) {
        if (process.env.NODE_ENV === 'production') {
            uploadDir = path.join(process.cwd(), 'uploads')
        } else {
            uploadDir = path.join(process.cwd(), 'public', 'uploads')
        }
    }
    return uploadDir
}

/**
 * Upload images temporarily to VPS for WooCommerce to fetch
 */
export async function uploadStoreProductImages(files: File[]) {
    const tempUrls: string[] = []
    const uploadDir = getUploadDir()

    try {
        await mkdir(uploadDir, { recursive: true })
    } catch (e) { }

    for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer())
        const filename = 'temp-prod-' + Date.now() + '-' + Math.random().toString(36).substring(7) + '-' + file.name.replace(/\s/g, '-')
        const filePath = path.join(uploadDir, filename)

        await writeFile(filePath, buffer)

        // Generate public URL relative to current domain
        // Since we have /api/uploads/[filename] route, we use that
        const publicUrl = `${process.env.NEXTAUTH_URL || ''}/api/uploads/${filename}`
        tempUrls.push(publicUrl)
    }

    return { success: true, urls: tempUrls }
}

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
                signal: AbortSignal.timeout(60000) // Increased timeout to 60s for stability
            })

            console.log(`Response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error details:', errorData);
                throw new Error(`Failed to fetch products page ${page}: ${response.status} ${response.statusText}. ${errorData.message || ''}`)
            }

            const products = await response.json()
            console.log(`Received ${Array.isArray(products) ? products.length : 'non-array'} products on page ${page}.`);

            if (!Array.isArray(products) || products.length === 0) break

            allProducts = [...allProducts, ...products]

            // Check total pages header as a backup for safety
            const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0');
            if (totalPages > 0 && page >= totalPages) {
                console.log(`Reached last page (${page}/${totalPages}) based on X-WP-TotalPages header.`);
                break;
            }

            // Fallback: if we got less than perPage, we're likely at the end (standard WP behavior)
            if (products.length < perPage) break

            page++
        } catch (fetchError: any) {
            console.error(`Error during fetch (page ${page}):`, fetchError.message);
            throw fetchError;
        }
    }

    return allProducts
}

/**
 * Fetch all product categories from WooCommerce
 */
export async function getWooCommerceCategories() {
    const WC_URL = process.env.NEXT_PUBLIC_WC_URL
    const WC_KEY = process.env.WC_CONSUMER_KEY
    const WC_SECRET = process.env.WC_CONSUMER_SECRET

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        return { success: false, error: 'WooCommerce API credentials are not configured' }
    }

    try {
        const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
        const baseUrl = WC_URL.replace(/\/$/, '')

        let allCategories: any[] = []
        let page = 1
        const perPage = 100

        while (true) {
            const url = `${baseUrl}/wp-json/wc/v3/products/categories?per_page=${perPage}&page=${page}`
            console.log(`Fetching categories page ${page}...`)

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Basic ${auth}`
                },
                next: { revalidate: 3600 } // Cache for 1 hour
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch categories: ${response.status}`)
            }

            const categories = await response.json()
            if (!Array.isArray(categories) || categories.length === 0) break

            allCategories = [...allCategories, ...categories]
            if (categories.length < perPage) break
            page++
        }

        return { success: true, categories: allCategories }
    } catch (error: any) {
        console.error('Error fetching categories:', error)
        return { success: false, error: error.message || 'Gagal mengambil kategori' }
    }
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
                        weight: parseFloat(product.weight) || 0,
                        images: JSON.stringify(product.images),
                        categories: JSON.stringify(product.categories),
                        updatedAt: new Date(),
                        isMissingFromWoo: false,
                        backupGudang: product.meta_data?.find((m: any) => m.key === 'backup_gudang' || m.key === '_pos_barcode')?.value?.toString() || null,
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
                        weight: parseFloat(product.weight) || 0,
                        images: JSON.stringify(product.images),
                        categories: JSON.stringify(product.categories),
                        purchased: false,
                        isMissingFromWoo: false,
                        backupGudang: product.meta_data?.find((m: any) => m.key === 'backup_gudang' || m.key === '_pos_barcode')?.value?.toString() || null,
                    }
                });
                syncedCount++;

                // If variable product, fetch and sync variations with pagination
                if (product.type === 'variable') {
                    console.log(`Product ${product.id} is variable, fetching variations...`);
                    const baseUrl = WC_URL.replace(/\/$/, '');
                    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

                    let varPage = 1;
                    const varPerPage = 100;

                    while (true) {
                        const varUrl = `${baseUrl}/wp-json/wc/v3/products/${product.id}/variations?per_page=${varPerPage}&page=${varPage}`;
                        console.log(`Fetching variations for ${product.name} (ID: ${product.id}) page ${varPage} from ${varUrl}`);

                        try {
                            const varResponse = await fetch(varUrl, {
                                headers: { 'Authorization': `Basic ${auth}` },
                                next: { revalidate: 0 }
                            });

                            if (varResponse.ok) {
                                const variations = await varResponse.json();
                                console.log(`Found ${variations.length} variations on page ${varPage} for product ${product.id}`);

                                if (!Array.isArray(variations) || variations.length === 0) break;

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
                                            weight: parseFloat(variation.weight) || 0,
                                            images: JSON.stringify(variation.image ? [variation.image] : []),
                                            attributes: JSON.stringify(variation.attributes),
                                            parentId: product.id,
                                            updatedAt: new Date(),
                                            isMissingFromWoo: false,
                                            backupGudang: variation.meta_data?.find((m: any) => m.key === 'backup_gudang' || m.key === '_pos_barcode')?.value?.toString() || null,
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
                                            weight: parseFloat(variation.weight) || 0,
                                            images: JSON.stringify(variation.image ? [variation.image] : []),
                                            attributes: JSON.stringify(variation.attributes),
                                            parentId: product.id,
                                            purchased: false,
                                            isMissingFromWoo: false,
                                            backupGudang: variation.meta_data?.find((m: any) => m.key === 'backup_gudang' || m.key === '_pos_barcode')?.value?.toString() || null,
                                        }
                                    });
                                    syncedCount++;
                                }

                                if (variations.length < varPerPage) break;
                                varPage++;
                            } else {
                                console.error(`Error response fetching variations for ${product.id}: ${varResponse.status}`);
                                break;
                            }
                        } catch (varError: any) {
                            console.error(`Error syncing variations for product ${product.id} on page ${varPage}:`, varError.message);
                            break;
                        }
                    }
                }
            } catch (upsertError: any) {
                errorCount++;
                console.error(`Failed to upsert product ID ${product.id} (${product.name}):`, upsertError.message);
            }
        }

        // Mark products as missing if they were not in the fetched list
        // ONLY if sync was fully completed without major fetch errors
        if (fetchedWcIds.length > 500) { // Safety: Don't mark everything as missing if we only fetched a few items
            console.log(`Checking for products to mark as missing. Fetched IDs count: ${fetchedWcIds.length}`);
            await prisma.storeProduct.updateMany({
                where: {
                    wcId: { notIn: fetchedWcIds },
                    isMissingFromWoo: false
                },
                data: {
                    isMissingFromWoo: true
                }
            });
        } else {
            console.warn(`Sync potentially incomplete (only ${fetchedWcIds.length} items fetched). skipping mark as missing.`);
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

export async function toggleStoreProductPurchased(
    wcId: number,
    purchased: boolean,
    purchaseData?: {
        purchasePackage?: number
        purchaseQty?: number
        purchasePrice?: number
        purchaseCurrency?: string
    }
) {
    try {
        const updateData: any = {
            purchased,
            purchasedAt: purchased ? new Date() : null,
        }

        if (purchased && purchaseData) {
            updateData.purchasePackage = purchaseData.purchasePackage ?? null
            updateData.purchaseQty = purchaseData.purchaseQty ?? null
            updateData.purchasePrice = purchaseData.purchasePrice ?? null
            updateData.purchaseCurrency = purchaseData.purchaseCurrency ?? null
        }

        await prisma.storeProduct.update({
            where: { wcId },
            data: updateData
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
export async function updatePurchaseData(
    wcId: number,
    data: {
        purchasePackage?: number
        purchaseQty?: number
        purchasePrice?: number
        purchaseCurrency?: string
    }
) {
    try {
        await prisma.storeProduct.update({
            where: { wcId },
            data: {
                purchasePackage: data.purchasePackage ?? null,
                purchaseQty: data.purchaseQty ?? null,
                purchasePrice: data.purchasePrice ?? null,
                purchaseCurrency: data.purchaseCurrency ?? null,
            }
        })
        revalidatePath('/store/product')
        revalidatePath('/store/low-stock')
        revalidatePath('/store/purchased')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating purchase data:', error)
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
            backupGudang: p.meta_data?.find((m: any) => m.key === 'backup_gudang' || m.key === '_pos_barcode')?.value?.toString() || null,
            slug: p.slug,
            source: 'store'
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
            backupGudang: v.meta_data?.find((m: any) => m.key === 'backup_gudang' || m.key === '_pos_barcode')?.value?.toString() || null,
            slug: v.slug,
            source: 'store'
        }))
    } catch (error) {
        console.error(`Error fetching variations for product ${productId}:`, error)
        return []
    }
}

export async function updateWooCommerceProduct(wcId: number, data: {
    name?: string
    sku?: string
    regularPrice?: number | null
    salePrice?: number | null
    stockQuantity?: number | null
    status?: string
    weight?: number | null
    backupGudang?: string
    description?: string
    categoryId?: number | null
    parentId?: number
}) {
    const WC_URL = process.env.NEXT_PUBLIC_WC_URL
    const WC_KEY = process.env.WC_CONSUMER_KEY
    const WC_SECRET = process.env.WC_CONSUMER_SECRET

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        return { success: false, error: 'WooCommerce API credentials are not configured' }
    }

    try {
        const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
        const baseUrl = WC_URL.replace(/\/$/, '')

        // Determine endpoint based on whether it is a variation or a main product
        let url = `${baseUrl}/wp-json/wc/v3/products/${wcId}`
        if (data.parentId) {
            url = `${baseUrl}/wp-json/wc/v3/products/${data.parentId}/variations/${wcId}`
        }

        const wcPayload: any = {}
        if (data.name) wcPayload.name = data.name
        if (data.sku !== undefined) wcPayload.sku = data.sku
        if (data.status !== undefined) wcPayload.status = data.status
        if (data.regularPrice !== undefined) wcPayload.regular_price = data.regularPrice === null ? "" : data.regularPrice.toString()
        if (data.salePrice !== undefined) wcPayload.sale_price = data.salePrice === null ? "" : data.salePrice.toString()
        if (data.stockQuantity !== undefined) {
            wcPayload.manage_stock = data.stockQuantity !== null
            wcPayload.stock_quantity = data.stockQuantity
        }

        if (data.weight !== undefined) {
            wcPayload.weight = data.weight === null ? "" : data.weight.toString()
        }

        if (data.description !== undefined) {
            wcPayload.description = data.description
        }

        if (data.categoryId !== undefined) {
            wcPayload.categories = data.categoryId ? [{ id: data.categoryId }] : []
        }

        if (data.backupGudang !== undefined) {
            wcPayload.meta_data = [
                {
                    key: 'backup_gudang',
                    value: data.backupGudang
                }
            ]
        }

        console.log(`Updating WooCommerce product ${wcId}...`, wcPayload)

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(wcPayload)
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('WooCommerce API Update Error:', errorData)
            return { success: false, error: errorData.message || `HTTP ${response.status}` }
        }

        const updatedWcProduct = await response.json()

        // Sync to local database
        await prisma.storeProduct.update({
            where: { wcId },
            data: {
                name: data.name || undefined,
                sku: data.sku !== undefined ? data.sku : undefined,
                regularPrice: data.regularPrice !== undefined ? data.regularPrice : undefined,
                salePrice: data.salePrice !== undefined ? data.salePrice : undefined,
                stockQuantity: data.stockQuantity !== undefined ? data.stockQuantity : undefined,
                status: data.status !== undefined ? data.status : undefined,
                weight: data.weight !== undefined ? (data.weight === null ? null : parseFloat(data.weight.toString())) : undefined,
                backupGudang: data.backupGudang !== undefined ? data.backupGudang : undefined,
                description: data.description !== undefined ? data.description : undefined,
                categories: updatedWcProduct.categories ? JSON.stringify(updatedWcProduct.categories) : undefined,
                price: parseFloat(updatedWcProduct.price) || 0, // Get calculated price from WC
                updatedAt: new Date()
            }
        })

        revalidatePath('/store/product')
        revalidatePath('/store/low-stock')
        revalidatePath('/store/purchased')

        return { success: true, product: updatedWcProduct }
    } catch (error: any) {
        console.error('Error in updateWooCommerceProduct:', error)
        return { success: false, error: error.message || 'Terjadi kesalahan sistem' }
    }
}
export async function deleteWooCommerceProduct(wcId: number, parentId?: number) {
    const WC_URL = process.env.NEXT_PUBLIC_WC_URL
    const WC_KEY = process.env.WC_CONSUMER_KEY
    const WC_SECRET = process.env.WC_CONSUMER_SECRET

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        return { success: false, error: 'WooCommerce API credentials are not configured' }
    }

    try {
        const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
        const baseUrl = WC_URL.replace(/\/$/, '')

        let url = `${baseUrl}/wp-json/wc/v3/products/${wcId}?force=true`
        if (parentId) {
            url = `${baseUrl}/wp-json/wc/v3/products/${parentId}/variations/${wcId}?force=true`
        }

        console.log(`Deleting WooCommerce product ${wcId}...`)

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('WooCommerce API Delete Error:', errorData)
            return { success: false, error: errorData.message || `HTTP ${response.status}` }
        }

        await prisma.storeProduct.deleteMany({
            where: { wcId }
        })

        revalidatePath('/store/product')
        revalidatePath('/store/low-stock')
        revalidatePath('/store/purchased')

        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteWooCommerceProduct:', error)
        return { success: false, error: error.message || 'Terjadi kesalahan sistem' }
    }
}

export async function createWooCommerceProduct(data: {
    name: string
    sku?: string
    regularPrice?: number | null
    salePrice?: number | null
    stockQuantity?: number | null
    status?: string
    weight?: number | null
    backupGudang?: string
    description?: string
    categoryId?: number | null
    imageUrls?: string[]
}) {
    const WC_URL = process.env.NEXT_PUBLIC_WC_URL
    const WC_KEY = process.env.WC_CONSUMER_KEY
    const WC_SECRET = process.env.WC_CONSUMER_SECRET

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        return { success: false, error: 'WooCommerce API credentials are not configured' }
    }

    try {
        const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
        const baseUrl = WC_URL.replace(/\/$/, '')
        const url = `${baseUrl}/wp-json/wc/v3/products`

        const wcPayload: any = {
            name: data.name,
            type: 'simple' // Default for new products through our app
        }

        if (data.sku !== undefined) wcPayload.sku = data.sku
        if (data.status !== undefined) wcPayload.status = data.status
        if (data.regularPrice !== undefined) wcPayload.regular_price = data.regularPrice?.toString() || ""
        if (data.salePrice !== undefined) wcPayload.sale_price = data.salePrice?.toString() || ""
        if (data.description !== undefined) wcPayload.description = data.description

        if (data.categoryId !== undefined) {
            wcPayload.categories = data.categoryId ? [{ id: data.categoryId }] : []
        }

        if (data.stockQuantity !== undefined && data.stockQuantity !== null) {
            wcPayload.manage_stock = true
            wcPayload.stock_quantity = data.stockQuantity
        } else {
            wcPayload.manage_stock = false
        }

        if (data.weight !== undefined) {
            wcPayload.weight = data.weight?.toString() || ""
        }

        if (data.backupGudang !== undefined) {
            wcPayload.meta_data = [
                {
                    key: 'backup_gudang',
                    value: data.backupGudang
                }
            ]
        }

        // Add images to payload
        if (data.imageUrls && data.imageUrls.length > 0) {
            wcPayload.images = data.imageUrls.map(url => ({ src: url }))
        }

        console.log('Creating product in WooCommerce...', wcPayload)

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(wcPayload)
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('WooCommerce API Create Error:', errorData)
            throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        const newWcProduct = await response.json()

        // Sync to local database
        await prisma.storeProduct.create({
            data: {
                wcId: newWcProduct.id,
                name: newWcProduct.name,
                slug: newWcProduct.slug,
                sku: newWcProduct.sku,
                type: newWcProduct.type,
                status: newWcProduct.status,
                description: newWcProduct.description,
                shortDescription: newWcProduct.short_description,
                price: parseFloat(newWcProduct.price) || 0,
                regularPrice: parseFloat(newWcProduct.regular_price) || 0,
                salePrice: parseFloat(newWcProduct.sale_price) || 0,
                stockQuantity: newWcProduct.stock_quantity || 0,
                stockStatus: newWcProduct.stock_status,
                weight: parseFloat(newWcProduct.weight) || 0,
                images: JSON.stringify(newWcProduct.images),
                categories: JSON.stringify(newWcProduct.categories),
                purchased: false,
                isMissingFromWoo: false,
                backupGudang: data.backupGudang || null,
                updatedAt: new Date()
            }
        })

        // Cleanup temporary images after WooCommerce has downloaded them
        if (data.imageUrls && data.imageUrls.length > 0) {
            const uploadDir = getUploadDir()
            for (const url of data.imageUrls) {
                try {
                    const filename = url.split('/').pop()
                    if (filename) {
                        const filePath = path.join(uploadDir, filename)
                        await unlink(filePath)
                        console.log('Deleted temporary image after sync:', filePath)
                    }
                } catch (cleanupError) {
                    console.error('Failed to cleanup temporary image:', url, cleanupError)
                }
            }
        }

        revalidatePath('/store/product')
        revalidatePath('/store/low-stock')
        revalidatePath('/store/purchased')
        return { success: true, product: newWcProduct }
    } catch (error: any) {
        console.error('Error in createWooCommerceProduct:', error)

        // Cleanup even on error if we have URLs
        if (data.imageUrls && data.imageUrls.length > 0) {
            const uploadDir = getUploadDir()
            for (const url of data.imageUrls) {
                try {
                    const filename = url.split('/').pop()
                    if (filename) {
                        const filePath = path.join(uploadDir, filename)
                        await unlink(filePath).catch(() => { })
                    }
                } catch (e) { }
            }
        }

        return { success: false, error: error.message || 'Terjadi kesalahan sistem' }
    }
}

export async function syncSingleStoreProduct(wcId: number, parentId?: number) {
    console.log(`Starting syncSingleStoreProduct for ID: ${wcId}${parentId ? ` (parent: ${parentId})` : ''}...`);

    const WC_URL = process.env.NEXT_PUBLIC_WC_URL
    const WC_KEY = process.env.WC_CONSUMER_KEY
    const WC_SECRET = process.env.WC_CONSUMER_SECRET

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
        return { success: false, error: 'WooCommerce API credentials are not configured' }
    }

    try {
        const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
        const baseUrl = WC_URL.replace(/\/$/, '')

        // Determine URL (product vs variation)
        let url = `${baseUrl}/wp-json/wc/v3/products/${wcId}`
        if (parentId) {
            url = `${baseUrl}/wp-json/wc/v3/products/${parentId}/variations/${wcId}`
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${auth}`
            },
            next: { revalidate: 0 },
            cache: 'no-store'
        })

        if (!response.ok) {
            if (response.status === 404) {
                // Mark as missing if not found in WooCommerce
                await prisma.storeProduct.update({
                    where: { wcId },
                    data: { isMissingFromWoo: true }
                })
                return { success: false, error: 'Produk tidak ditemukan di WooCommerce (404)' }
            }
            throw new Error(`Failed to fetch product: ${response.statusText}`)
        }

        const product = await response.json()

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
        }

        if (!parentId) {
            productData.type = product.type
            productData.description = product.description
            productData.shortDescription = product.short_description
            productData.categories = JSON.stringify(product.categories)
        } else {
            productData.type = 'variation'
            productData.parentId = parentId
            productData.attributes = JSON.stringify(product.attributes)
        }

        await prisma.storeProduct.upsert({
            where: { wcId: product.id },
            update: productData,
            create: {
                ...productData,
                wcId: product.id,
                purchased: false
            }
        })

        // If variable product and NOT a variation itself, sync its variations too
        if (!parentId && product.type === 'variable') {
            console.log(`Product ${product.id} is variable, syncing variations...`)
            const varUrl = `${baseUrl}/wp-json/wc/v3/products/${product.id}/variations?per_page=100`
            const varResponse = await fetch(varUrl, {
                headers: { 'Authorization': `Basic ${auth}` },
                next: { revalidate: 0 }
            })

            if (varResponse.ok) {
                const variations = await varResponse.json()
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
                    }

                    await prisma.storeProduct.upsert({
                        where: { wcId: variation.id },
                        update: varData,
                        create: {
                            ...varData,
                            wcId: variation.id,
                            purchased: false
                        }
                    })
                }
            }
        }

        revalidatePath('/store/product')
        return { success: true }
    } catch (error: any) {
        console.error(`Error syncing product ${wcId}:`, error.message)
        return { success: false, error: error.message }
    }
}
export async function getStoreProductBySku(sku: string) {
    try {
        // 1. Try to find in StoreProduct (WooCommerce) first, by SKU or backupGudang (location)
        let product = await prisma.storeProduct.findFirst({
            where: {
                OR: [
                    { sku: sku },
                    { backupGudang: sku }
                ]
            }
        })

        if (product) {
            let images = []
            try {
                if (product.images) images = JSON.parse(product.images)
            } catch (e) { }

            let categories = []
            try {
                if (product.categories) categories = JSON.parse(product.categories)
            } catch (e) { }

            let attributes = []
            try {
                if (product.attributes) attributes = JSON.parse(product.attributes)
            } catch (e) { }

            return {
                ...product,
                images,
                categories,
                attributes,
                source: 'store'
            }
        }

        // 2. Fallback: Try to find in internal Product table
        const internalProduct = await prisma.product.findFirst({
            where: { sku: sku }
        })

        if (internalProduct) {
            return {
                ...internalProduct,
                source: 'internal',
                // Map to common fields for the modal
                images: internalProduct.image ? [internalProduct.image] : [],
                description: internalProduct.notes
            }
        }

        // 3. Fallback: Try to find in sparepartProject
        const sparepart = await (prisma as any).sparepartProject.findFirst({
            where: { sku: sku }
        })

        if (sparepart) {
            return {
                ...sparepart,
                source: 'sparepart',
                images: sparepart.image ? [sparepart.image] : [],
                description: sparepart.notes
            }
        }

        return null
    } catch (error) {
        console.error('Error fetching product by SKU:', error)
        return null
    }
}
