'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt } from '@/lib/crypto'

// Keys that should be encrypted
const ENCRYPTED_KEYS = ['API_KEY']

/**
 * Get a single system setting by key
 */
export async function getSystemSetting(key: string): Promise<string | null> {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key }
        })

        if (!setting) return null

        // Decrypt if needed
        if (ENCRYPTED_KEYS.includes(key)) {
            return decrypt(setting.value)
        }

        return setting.value
    } catch (error) {
        console.error('Error getting system setting:', error)
        return null
    }
}

/**
 * Get all API-related settings
 */
export async function getAllApiSettings(): Promise<{
    apiEndpoint: string | null
    apiKey: string | null
    senderName: string | null
    senderPhone: string | null
    senderAddress: string | null
}> {
    try {
        const [endpoint, key, name, phone, address] = await Promise.all([
            prisma.systemSetting.findUnique({ where: { key: 'API_ENDPOINT' } }),
            prisma.systemSetting.findUnique({ where: { key: 'API_KEY' } }),
            prisma.systemSetting.findUnique({ where: { key: 'SENDER_NAME' } }),
            prisma.systemSetting.findUnique({ where: { key: 'SENDER_PHONE' } }),
            prisma.systemSetting.findUnique({ where: { key: 'SENDER_ADDRESS' } })
        ])

        return {
            apiEndpoint: endpoint?.value || null,
            apiKey: key ? decrypt(key.value) : null,
            senderName: name?.value || null,
            senderPhone: phone?.value || null,
            senderAddress: address?.value || null
        }
    } catch (error) {
        console.error('Error getting API settings:', error)
        return {
            apiEndpoint: null,
            apiKey: null,
            senderName: null,
            senderPhone: null,
            senderAddress: null
        }
    }
}

/**
 * Update or create a system setting
 */
export async function updateSystemSetting(key: string, value: string): Promise<{ success: boolean, error?: string }> {
    try {
        // Encrypt if needed
        const storedValue = ENCRYPTED_KEYS.includes(key) ? (encrypt(value) || '') : value

        await prisma.systemSetting.upsert({
            where: { key },
            update: { value: storedValue },
            create: { key, value: storedValue }
        })

        revalidatePath('/settings')
        return { success: true }
    } catch (error) {
        console.error('Error updating system setting:', error)
        return { success: false, error: 'Gagal menyimpan pengaturan' }
    }
}

/**
 * Save all API settings at once
 */
export async function saveApiSettings(
    apiEndpoint: string,
    apiKey: string,
    senderName?: string,
    senderPhone?: string,
    senderAddress?: string
): Promise<{ success: boolean, error?: string }> {
    try {
        const encryptedApiKey = encrypt(apiKey) || ''

        const updates = [
            prisma.systemSetting.upsert({
                where: { key: 'API_ENDPOINT' },
                update: { value: apiEndpoint },
                create: { key: 'API_ENDPOINT', value: apiEndpoint }
            }),
            prisma.systemSetting.upsert({
                where: { key: 'API_KEY' },
                update: { value: encryptedApiKey },
                create: { key: 'API_KEY', value: encryptedApiKey }
            })
        ]

        // Add sender settings if provided
        if (senderName !== undefined) {
            updates.push(prisma.systemSetting.upsert({
                where: { key: 'SENDER_NAME' },
                update: { value: senderName },
                create: { key: 'SENDER_NAME', value: senderName }
            }))
        }

        if (senderPhone !== undefined) {
            updates.push(prisma.systemSetting.upsert({
                where: { key: 'SENDER_PHONE' },
                update: { value: senderPhone },
                create: { key: 'SENDER_PHONE', value: senderPhone }
            }))
        }

        if (senderAddress !== undefined) {
            updates.push(prisma.systemSetting.upsert({
                where: { key: 'SENDER_ADDRESS' },
                update: { value: senderAddress },
                create: { key: 'SENDER_ADDRESS', value: senderAddress }
            }))
        }

        await Promise.all(updates)

        revalidatePath('/settings')
        return { success: true }
    } catch (error) {
        console.error('Error saving API settings:', error)
        return { success: false, error: 'Gagal menyimpan pengaturan API' }
    }
}

/**
 * Test API connection with current settings
 */
export async function testApiConnection(): Promise<{ success: boolean, message: string }> {
    try {
        const { apiEndpoint, apiKey } = await getAllApiSettings()

        if (!apiEndpoint) {
            return { success: false, message: 'API Endpoint belum dikonfigurasi' }
        }

        const response = await fetch(apiEndpoint, {
            method: 'GET',
            headers: {
                //'Authorization': apiKey ? `Bearer ${apiKey}` : '', // Changed to X-API-Key based on latest requirement
                'X-API-Key': apiKey || '',
                'Content-Type': 'application/json'
            },
            // 5 second timeout
            signal: AbortSignal.timeout(5000)
        })

        if (response.ok) {
            return { success: true, message: `Koneksi berhasil! Status: ${response.status}` }
        } else {
            return { success: false, message: `Gagal: HTTP ${response.status} ${response.statusText}` }
        }
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'TimeoutError') {
                return { success: false, message: 'Koneksi timeout (5 detik)' }
            }
            return { success: false, message: `Error: ${error.message}` }
        }
        return { success: false, message: 'Gagal menghubungi API' }
    }
}
