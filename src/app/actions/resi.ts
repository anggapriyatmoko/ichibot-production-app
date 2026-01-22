'use server'

import { apiClient } from '@/lib/api-client'
import { getSystemSetting } from './system-settings'

export interface ResiData {
    sender_name: string
    sender_phone: string
    sender_address: string
    receiver_name: string
    receiver_phone: string
    receiver_address: string
    courier_id?: number
    notes?: string
    tracking_number?: string
    status?: string
}

export interface ResiResponse {
    success: boolean
    message: string
    data?: {
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
        courier?: {
            id: number
            service_name: string
            service_image: string | null
            service_image_url: string | null
        }
        courier_id: number | null
        notes: string | null
        tracking_number: string | null
        status: string
        created_at: string
        updated_at: string
    }
}

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
 * Create a new resi via API
 */
export async function createResi(data: ResiData): Promise<ResiResponse> {
    try {
        const response = await apiClient.post<ResiResponse>('/resi', data)

        if (!response.success) {
            return {
                success: false,
                message: response.error || 'Gagal membuat resi'
            }
        }

        // The API returns success/message/data structure
        if (response.data && typeof response.data === 'object') {
            return response.data as ResiResponse
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
 * Test API connection by sending test resi data
 */
export async function testCreateResi(testData: ResiData): Promise<ResiResponse> {
    return createResi(testData)
}
