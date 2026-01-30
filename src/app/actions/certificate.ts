'use server'

import { apiClient } from '@/lib/api-client'

// Types for Certificate
export interface Certificate {
    id: number
    certificate_number: string
    recipient_name: string
    instansi: string
    present_text_idn: string
    present_text_eng: string
    description_text_idn: string
    description_text_eng: string
    activity_text_idn: string
    activity_text_eng: string
    completion_text_idn: string
    completion_text_eng: string
    evaluation_text_idn: string
    evaluation_text_eng: string
    materi_judul: string
    materi: string[]
    materi_nilai: number[]
    start_date: string
    end_date: string
    signature_name: string
    access_token?: string
    pdf_urls?: {
        download_gan: string
        download_ichibot: string
        secure_download_gan: string
        secure_download_ichibot: string
        preview_gan: string
        preview_ichibot: string
        secure_preview_gan: string
        secure_preview_ichibot: string
        qr_download_gan?: string
        qr_download_ichibot?: string
    }
    created_at: string
    updated_at: string
}

// Form data with all required fields
export interface CertificateFormData {
    certificate_number?: string  // Auto-generated if not provided
    recipient_name: string
    instansi: string
    present_text_idn: string
    present_text_en: string
    description_text_idn: string
    description_text_en: string
    activity_text_idn: string
    activity_text_en: string
    completion_text_idn: string
    completion_text_en: string
    evaluation_text_idn: string
    evaluation_text_en: string
    start_date: string
    end_date: string
    signature_name: string
    materi_judul?: string
    materi?: string[]
    nilai?: (number | string)[]
}

export interface CertificateListResponse {
    success: boolean
    message: string
    data?: {
        certificates: Certificate[]
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

export interface CertificateSingleResponse {
    success: boolean
    message: string
    data?: Certificate
    error?: string
}

// API Endpoint
const API_ENDPOINT = '/certificates'

/**
 * Generate next certificate number from API
 */
export async function generateCertificateNumber(): Promise<string> {
    try {
        const response = await apiClient.get<{ success: boolean; certificate_number: string }>(`${API_ENDPOINT}/generate-number`)
        if (response.success && response.data?.certificate_number) {
            return response.data.certificate_number
        }
        // Fallback to simple format if API fails
        const now = new Date()
        const monthRomans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
        const monthRoman = monthRomans[now.getMonth()]
        const year = now.getFullYear()
        return `1/SP/${monthRoman}/${year}`
    } catch {
        // Fallback to simple format if API fails
        const now = new Date()
        const monthRomans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
        const monthRoman = monthRomans[now.getMonth()]
        const year = now.getFullYear()
        return `1/SP/${monthRoman}/${year}`
    }
}

/**
 * Translate text from Indonesian to English
 */
export async function translateText(text: string): Promise<string> {
    if (!text || text.trim() === '') return ''

    try {
        const response = await apiClient.post<{ success: boolean; text: string }>(`${API_ENDPOINT}/translate`, { text })
        if (response.success && response.data?.text) {
            return response.data.text
        }
        return text // Return original if translation fails
    } catch {
        return text // Return original if translation fails
    }
}

/**
 * Get all certificates with pagination and optional search
 */
export async function getCertificates(params?: {
    page?: number
    per_page?: number
    search?: string
}): Promise<CertificateListResponse> {
    try {
        const queryParams = new URLSearchParams()
        if (params?.page) queryParams.append('page', params.page.toString())
        if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
        if (params?.search) queryParams.append('search', params.search)

        const queryString = queryParams.toString()
        const endpoint = `${API_ENDPOINT}${queryString ? `?${queryString}` : ''}`

        // API returns { data: Certificate[], meta: {...}, links: {...} }
        interface ApiListResponse {
            data: Certificate[]
            meta: {
                current_page: number
                last_page: number
                per_page: number
                total: number
                from: number | null
                to: number | null
            }
        }

        const response = await apiClient.get<ApiListResponse>(endpoint)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mengambil data sertifikat'
            }
        }

        if (response.data) {
            // Transform to our expected format
            return {
                success: true,
                message: 'Berhasil',
                data: {
                    certificates: response.data.data || [],
                    pagination: {
                        current_page: response.data.meta?.current_page || 1,
                        last_page: response.data.meta?.last_page || 1,
                        per_page: response.data.meta?.per_page || 15,
                        total: response.data.meta?.total || 0,
                        from: response.data.meta?.from || null,
                        to: response.data.meta?.to || null,
                    }
                }
            }
        }

        return {
            success: false,
            message: 'Data tidak ditemukan'
        }
    } catch (error) {
        console.error('Error fetching certificates:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Get single certificate by ID
 */
export async function getCertificate(id: number): Promise<CertificateSingleResponse> {
    try {
        const response = await apiClient.get<CertificateSingleResponse>(`${API_ENDPOINT}/${id}`)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mengambil data sertifikat'
            }
        }

        if (response.data) {
            return response.data
        }

        return {
            success: false,
            message: 'Sertifikat tidak ditemukan'
        }
    } catch (error) {
        console.error('Error fetching certificate:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Create new certificate
 */
export async function createCertificate(data: CertificateFormData): Promise<CertificateSingleResponse> {
    try {
        // Ensure certificate_number is set
        const payload = {
            ...data,
            certificate_number: data.certificate_number || await generateCertificateNumber(),
        }

        const response = await apiClient.post<CertificateSingleResponse>(API_ENDPOINT, payload)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal membuat sertifikat'
            }
        }

        if (response.data) {
            return response.data
        }

        return {
            success: true,
            message: 'Sertifikat berhasil dibuat'
        }
    } catch (error) {
        console.error('Error creating certificate:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Update existing certificate
 */
export async function updateCertificate(id: number, data: Partial<CertificateFormData>): Promise<CertificateSingleResponse> {
    try {
        const response = await apiClient.put<CertificateSingleResponse>(`${API_ENDPOINT}/${id}`, data)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal mengupdate sertifikat'
            }
        }

        if (response.data) {
            return response.data
        }

        return {
            success: true,
            message: 'Sertifikat berhasil diupdate'
        }
    } catch (error) {
        console.error('Error updating certificate:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}

/**
 * Delete certificate
 */
export async function deleteCertificate(id: number): Promise<{ success: boolean; message: string }> {
    try {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`${API_ENDPOINT}/${id}`)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal menghapus sertifikat'
            }
        }

        if (response.data) {
            return response.data
        }

        return {
            success: true,
            message: 'Sertifikat berhasil dihapus'
        }
    } catch (error) {
        console.error('Error deleting certificate:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Terjadi kesalahan'
        }
    }
}
