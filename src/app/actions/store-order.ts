'use server'

import { revalidatePath } from 'next/cache'

type OrderItem = {
    product_id: number
    variation_id?: number
    quantity: number
    price?: number // Force price override
}

type CreateOrderParams = {
    items: OrderItem[]
    customerNote?: string
    paymentMethod: string
    paymentMethodTitle: string
    setPaid: boolean
    billing?: {
        first_name: string
        last_name: string
        email: string
        phone: string
    }
    cashierName?: string // New parameter
}

export async function createWooCommerceOrder(params: CreateOrderParams) {
    const url = `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/wc/v3/orders`
    const consumerKey = process.env.WC_CONSUMER_KEY
    const consumerSecret = process.env.WC_CONSUMER_SECRET

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

    try {
        const payload = {
            payment_method: params.paymentMethod,
            payment_method_title: params.paymentMethodTitle,
            set_paid: params.setPaid,
            customer_note: params.customerNote,
            billing: params.billing,
            line_items: params.items.map(item => ({
                product_id: item.product_id,
                variation_id: item.variation_id,
                quantity: item.quantity,
                ...(item.price !== undefined && {
                    subtotal: (item.price * item.quantity).toString(),
                    total: (item.price * item.quantity).toString()
                })
            })),
            status: 'processing',
            meta_data: params.cashierName ? [
                {
                    key: '_pos_cashier_name',
                    value: params.cashierName
                }
            ] : []
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('WooCommerce API Error:', error)
            return {
                success: false,
                error: error.message || 'Gagal membuat pesanan di WooCommerce'
            }
        }

        const order = await response.json()

        revalidatePath('/store/pos')

        return {
            success: true,
            order: order
        }
    } catch (error) {
        console.error('Checkout Error:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan sistem saat menghubungi WooCommerce'
        }
    }
}

export async function getWooCommerceOrders(page: number = 1, search: string = '') {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
    const url = `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/wc/v3/orders?per_page=100&page=${page}${searchParam}`
    const consumerKey = process.env.WC_CONSUMER_KEY
    const consumerSecret = process.env.WC_CONSUMER_SECRET

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${auth}`
            },
            next: { revalidate: 0 },
            cache: 'no-store'
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('WooCommerce API Error (getOrders):', error)
            return {
                success: false,
                error: error.message || 'Gagal mengambil data order dari WooCommerce'
            }
        }

        const orders = await response.json()
        const totalItems = parseInt(response.headers.get('X-WP-Total') || '0')
        const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0')

        return {
            success: true,
            orders,
            totalItems,
            totalPages
        }
    } catch (error) {
        console.error('Fetch Orders error:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan saat menghubungkan ke WooCommerce'
        }
    }
}
