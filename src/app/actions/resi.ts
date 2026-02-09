'use server'

import { apiClient } from '@/lib/api-client'
import { getSystemSetting } from './system-settings'

// Types for Courier
export interface Courier {
    id: number
    service_name: string
    service_image: string | null
    service_image_url: string | null
    resis_count?: number
}

// Types for Resi
export interface Resi {
    id: number
    sender: {
        name: string
        phone: string
        address: string
    }
    receiver: {
        name: string
        phone: string
        address: string
    }
    courier?: Courier
    courier_id: number | null
    notes: string | null
    tracking_number: string | null
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
    pdf_urls?: {
        download: string
        preview: string
    }
    created_at: string
    updated_at: string
}

// Form data for create/update
export interface ResiFormData {
    sender_name: string
    sender_phone: string
    sender_address: string
    receiver_name: string
    receiver_phone: string
    receiver_address: string
    courier_id?: number | null
    notes?: string
    tracking_number?: string
    status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
}

export interface ResiListResponse {
    success: boolean
    message: string
    data?: {
        resis: Resi[]
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

export interface ResiSingleResponse {
    success: boolean
    message: string
    data?: Resi
    error?: string
}

export interface CourierListResponse {
    success: boolean
    message: string
    data?: Courier[]
    error?: string
}

// API Endpoint
const API_ENDPOINT = '/resi'

/**
 * Get default sender configuration from system settings
 */
export async function getDefaultSender(): Promise<{
    name: string
    phone: string
    address: string
}> {
    const [name, phone, address] = await Promise.all([
        getSystemSetting('SENDER_NAME'),
        getSystemSetting('SENDER_PHONE'),
        getSystemSetting('SENDER_ADDRESS')
    ])

    return {
        name: name || 'ICHIBOT',
        phone: phone || '',
        address: address || ''
    }
}

/**
 * Get all resis with pagination and optional filters
 */
export async function getResis(params?: {
    page?: number
    per_page?: number
    search?: string
    courier_id?: number
    status?: string
    start_date?: string
    end_date?: string
}): Promise<ResiListResponse> {
    try {
        const queryParams = new URLSearchParams()
        if (params?.page) queryParams.append('page', params.page.toString())
        if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
        if (params?.search) queryParams.append('search', params.search)
        if (params?.courier_id) queryParams.append('courier_id', params.courier_id.toString())
        if (params?.status) queryParams.append('status', params.status)
        if (params?.start_date) queryParams.append('start_date', params.start_date)
        if (params?.end_date) queryParams.append('end_date', params.end_date)

        const queryString = queryParams.toString()
        const endpoint = `${API_ENDPOINT}${queryString ? `?${queryString}` : ''}`

        interface ApiListResponse {
            success: boolean
            message: string
            data: {
                resis: Resi[]
                pagination: {
                    current_page: number
                    last_page: number
                    per_page: number
                    total: number
                    from: number | null
                    to: number | null
                }
            }
        }

        const response = await apiClient.get<ApiListResponse>(endpoint)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mengambil data resi'
            }
        }

        if (response.data) {
            return {
                success: true,
                message: 'Berhasil',
                data: {
                    resis: response.data.data?.resis || [],
                    pagination: response.data.data?.pagination || {
                        current_page: 1,
                        last_page: 1,
                        per_page: 15,
                        total: 0,
                        from: null,
                        to: null,
                    }
                }
            }
        }

        return {
            success: false,
            message: 'Data tidak ditemukan'
        }
    } catch (error) {
        console.error('Error fetching resis:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Get single resi by ID
 */
export async function getResi(id: number): Promise<ResiSingleResponse> {
    try {
        interface ApiResponse {
            success: boolean
            message: string
            data: Resi
        }

        const response = await apiClient.get<ApiResponse>(`${API_ENDPOINT}/${id}`)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mengambil data resi'
            }
        }

        if (response.data) {
            return {
                success: true,
                message: 'Berhasil',
                data: response.data.data
            }
        }

        return {
            success: false,
            message: 'Resi tidak ditemukan'
        }
    } catch (error) {
        console.error('Error fetching resi:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Create new resi
 */
export async function createResi(data: ResiFormData): Promise<ResiSingleResponse> {
    try {
        interface ApiResponse {
            success: boolean
            message: string
            data: Resi
        }

        const response = await apiClient.post<ApiResponse>(API_ENDPOINT, data)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal membuat resi'
            }
        }

        if (response.data) {
            return {
                success: true,
                message: 'Resi berhasil dibuat',
                data: response.data.data
            }
        }

        return {
            success: true,
            message: 'Resi berhasil dibuat'
        }
    } catch (error) {
        console.error('Error creating resi:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Update existing resi
 */
export async function updateResi(id: number, data: Partial<ResiFormData>): Promise<ResiSingleResponse> {
    try {
        interface ApiResponse {
            success: boolean
            message: string
            data: Resi
        }

        const response = await apiClient.put<ApiResponse>(`${API_ENDPOINT}/${id}`, data)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mengupdate resi'
            }
        }

        if (response.data) {
            return {
                success: true,
                message: 'Resi berhasil diupdate',
                data: response.data.data
            }
        }

        return {
            success: true,
            message: 'Resi berhasil diupdate'
        }
    } catch (error) {
        console.error('Error updating resi:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Update resi status only
 */
export async function updateResiStatus(id: number, status: string, tracking_number?: string): Promise<ResiSingleResponse> {
    try {
        interface ApiResponse {
            success: boolean
            message: string
            data: Resi
        }

        const payload: { status: string; tracking_number?: string } = { status }
        if (tracking_number) {
            payload.tracking_number = tracking_number
        }

        const response = await apiClient.patch<ApiResponse>(`${API_ENDPOINT}/${id}/status`, payload)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mengupdate status resi'
            }
        }

        if (response.data) {
            return {
                success: true,
                message: 'Status resi berhasil diupdate',
                data: response.data.data
            }
        }

        return {
            success: true,
            message: 'Status resi berhasil diupdate'
        }
    } catch (error) {
        console.error('Error updating resi status:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Delete resi
 */
export async function deleteResi(id: number): Promise<{ success: boolean; message: string }> {
    try {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`${API_ENDPOINT}/${id}`)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal menghapus resi'
            }
        }

        return {
            success: true,
            message: 'Resi berhasil dihapus'
        }
    } catch (error) {
        console.error('Error deleting resi:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Get all couriers
 */
export async function getCouriers(): Promise<CourierListResponse> {
    try {
        interface ApiResponse {
            success: boolean
            message: string
            data: Courier[]
        }

        const response = await apiClient.get<ApiResponse>(`${API_ENDPOINT}/couriers`)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mengambil data kurir'
            }
        }

        if (response.data) {
            return {
                success: true,
                message: 'Berhasil',
                data: response.data.data || []
            }
        }

        return {
            success: false,
            message: 'Data tidak ditemukan'
        }
    } catch (error) {
        console.error('Error fetching couriers:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

// Backward compatibility alias - this needs to be an async function for 'use server'
// For types, they should be imported from a separate non-server file

/**
 * Test API connection by sending test resi data
 * (Backward compatibility function)
 */
export async function testCreateResi(testData: ResiFormData): Promise<ResiSingleResponse> {
    return createResi(testData)
}


