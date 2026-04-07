'use server'

import { apiClient } from '@/lib/api-client'

// Types
export interface InvoiceGASItem {
    id?: number
    line_no?: number
    item_name: string
    name?: string
    price: number
    quantity: number
    unit: string
    total?: number
}

export interface InvoiceGAS {
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
    items: InvoiceGASItem[]
    pdf_urls?: {
        download: string
        secure_download: string
        preview: string
        secure_preview: string
    }
    created_at: string
    updated_at: string
}

export interface InvoiceGASFormData {
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

export interface InvoiceGASListResponse {
    success: boolean
    message: string
    data?: {
        invoices: InvoiceGAS[]
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

export interface InvoiceGASSingleResponse {
    success: boolean
    message: string
    data?: InvoiceGAS
    error?: string
}

// API Endpoint
const API_ENDPOINT = '/invoices-gas'

/**
 * Get all GAS invoices with pagination and optional search
 */
export async function getInvoicesGAS(params?: {
    page?: number
    per_page?: number
    search?: string
    start_date?: string
    end_date?: string
}): Promise<InvoiceGASListResponse> {
    try {
        const queryParams = new URLSearchParams()
        if (params?.page) queryParams.append('page', params.page.toString())
        if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
        if (params?.search) queryParams.append('search', params.search)
        if (params?.start_date) queryParams.append('start_date', params.start_date)
        if (params?.end_date) queryParams.append('end_date', params.end_date)

        const queryString = queryParams.toString()
        const endpoint = `${API_ENDPOINT}${queryString ? `?${queryString}` : ''}`

        const response = await apiClient.get<InvoiceGASListResponse>(endpoint)

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
            message: 'Data tidak ditemukan'
        }
    } catch (error) {
        console.error('Error fetching invoices GAS:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Get single GAS invoice by ID
 */
export async function getInvoiceGAS(id: number): Promise<InvoiceGASSingleResponse> {
    try {
        const response = await apiClient.get<InvoiceGASSingleResponse>(`${API_ENDPOINT}/${id}`)

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
        console.error('Error fetching invoice GAS:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Create new GAS invoice
 */
export async function createInvoiceGAS(data: InvoiceGASFormData): Promise<InvoiceGASSingleResponse> {
    try {
        const response = await apiClient.post<InvoiceGASSingleResponse>(API_ENDPOINT, data)

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
        console.error('Error creating invoice GAS:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Update existing GAS invoice
 */
export async function updateInvoiceGAS(id: number, data: InvoiceGASFormData): Promise<InvoiceGASSingleResponse> {
    try {
        const response = await apiClient.put<InvoiceGASSingleResponse>(`${API_ENDPOINT}/${id}`, data)

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
        console.error('Error updating invoice GAS:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Delete GAS invoice
 */
export async function deleteInvoiceGAS(id: number): Promise<{ success: boolean; message: string }> {
    try {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`${API_ENDPOINT}/${id}`)

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
        console.error('Error deleting invoice GAS:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}
