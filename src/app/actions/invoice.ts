'use server'

import { apiClient } from '@/lib/api-client'

// Types
export interface InvoiceItem {
    id?: number
    line_no?: number
    item_name: string
    name?: string // alias for form compatibility
    price: number
    quantity: number
    unit: string
    total?: number
}

export interface Invoice {
    id: number
    invoice_number: string
    invoice_date: string
    customer_name: string
    customer_address: string
    order_notes: string
    po_number: string
    svo_number: string
    do_number: string
    grand_total: number
    access_token?: string
    items: InvoiceItem[]
    pdf_urls?: {
        download: string
        secure_download: string
        preview: string
        secure_preview: string
    }
    created_at: string
    updated_at: string
}

export interface InvoiceFormData {
    invoice_date: string
    customer_name: string
    customer_address?: string
    order_notes?: string
    po_number?: string
    svo_number?: string
    do_number?: string
    items: {
        name: string
        price: number
        quantity: number
        unit: string
    }[]
}

export interface InvoiceListResponse {
    success: boolean
    message: string
    data?: {
        invoices: Invoice[]
        pagination: {
            current_page: number
            last_page: number
            per_page: number
            total: number
            from: number | null
            to: number | null
        }
    }
    error?: string
}

export interface InvoiceSingleResponse {
    success: boolean
    message: string
    data?: Invoice
    error?: string
}

export interface InvoiceStatsResponse {
    success: boolean
    message: string
    data?: {
        total_invoices: number
        total_amount: number
        invoices_this_month: number
        amount_this_month: number
        recent_invoices: Invoice[]
    }
    error?: string
}

/**
 * Get all invoices with pagination and optional search
 */
export async function getInvoices(params?: {
    page?: number
    per_page?: number
    search?: string
    start_date?: string
    end_date?: string
}): Promise<InvoiceListResponse> {
    try {
        // Build query string
        const queryParams = new URLSearchParams()
        if (params?.page) queryParams.append('page', params.page.toString())
        if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
        if (params?.search) queryParams.append('search', params.search)
        if (params?.start_date) queryParams.append('start_date', params.start_date)
        if (params?.end_date) queryParams.append('end_date', params.end_date)

        const queryString = queryParams.toString()
        const endpoint = `/invoices${queryString ? `?${queryString}` : ''}`

        const response = await apiClient.get<InvoiceListResponse>(endpoint)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mengambil data invoice'
            }
        }

        // Return the API response data directly
        if (response.data) {
            return response.data
        }

        return {
            success: false,
            message: 'Data tidak ditemukan'
        }
    } catch (error) {
        console.error('Error fetching invoices:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Get single invoice by ID
 */
export async function getInvoice(id: number): Promise<InvoiceSingleResponse> {
    try {
        const response = await apiClient.get<InvoiceSingleResponse>(`/invoices/${id}`)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mengambil data invoice'
            }
        }

        if (response.data) {
            return response.data
        }

        return {
            success: false,
            message: 'Invoice tidak ditemukan'
        }
    } catch (error) {
        console.error('Error fetching invoice:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Create new invoice
 */
export async function createInvoice(data: InvoiceFormData): Promise<InvoiceSingleResponse> {
    try {
        const response = await apiClient.post<InvoiceSingleResponse>('/invoices', data)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal membuat invoice'
            }
        }

        if (response.data) {
            return response.data
        }

        return {
            success: true,
            message: 'Invoice berhasil dibuat'
        }
    } catch (error) {
        console.error('Error creating invoice:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Update existing invoice
 */
export async function updateInvoice(id: number, data: InvoiceFormData): Promise<InvoiceSingleResponse> {
    try {
        const response = await apiClient.put<InvoiceSingleResponse>(`/invoices/${id}`, data)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mengupdate invoice'
            }
        }

        if (response.data) {
            return response.data
        }

        return {
            success: true,
            message: 'Invoice berhasil diupdate'
        }
    } catch (error) {
        console.error('Error updating invoice:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Delete invoice
 */
export async function deleteInvoice(id: number): Promise<{ success: boolean; message: string }> {
    try {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/invoices/${id}`)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal menghapus invoice'
            }
        }

        if (response.data) {
            return response.data
        }

        return {
            success: true,
            message: 'Invoice berhasil dihapus'
        }
    } catch (error) {
        console.error('Error deleting invoice:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStats(): Promise<InvoiceStatsResponse> {
    try {
        const response = await apiClient.get<InvoiceStatsResponse>('/invoices/stats')

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mengambil statistik invoice'
            }
        }

        if (response.data) {
            return response.data
        }

        return {
            success: false,
            message: 'Data statistik tidak ditemukan'
        }
    } catch (error) {
        console.error('Error fetching invoice stats:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Search invoices
 */
export async function searchInvoices(params: {
    q: string
    type?: 'all' | 'customer' | 'number' | 'amount'
    per_page?: number
}): Promise<InvoiceListResponse> {
    try {
        const queryParams = new URLSearchParams()
        queryParams.append('q', params.q)
        if (params.type) queryParams.append('type', params.type)
        if (params.per_page) queryParams.append('per_page', params.per_page.toString())

        const response = await apiClient.get<InvoiceListResponse>(`/invoices/search?${queryParams.toString()}`)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mencari invoice'
            }
        }

        if (response.data) {
            return response.data
        }

        return {
            success: false,
            message: 'Data tidak ditemukan'
        }
    } catch (error) {
        console.error('Error searching invoices:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}
