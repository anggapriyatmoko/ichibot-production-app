'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt } from '@/lib/crypto'
import { requireAdmin } from '@/lib/auth'

const RBAC_KEY = 'RBAC_CONFIG'

export type RbacConfig = Record<string, string[]> // href -> allowed roles

/**
 * Get the RBAC configuration from database (decrypted)
 */
export async function getRbacConfig(): Promise<RbacConfig | null> {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: RBAC_KEY }
        })

        if (!setting) return null

        const decrypted = decrypt(setting.value)
        if (!decrypted) return null

        return JSON.parse(decrypted) as RbacConfig
    } catch (error) {
        console.error('Error getting RBAC config:', error)
        return null
    }
}

/**
 * Save RBAC configuration to database (encrypted)
 * Admin only
 */
export async function saveRbacConfig(config: RbacConfig): Promise<{ success: boolean; error?: string }> {
    try {
        await requireAdmin()

        const jsonPayload = JSON.stringify(config)
        const encryptedValue = encrypt(jsonPayload)

        if (!encryptedValue) {
            return { success: false, error: 'Gagal mengenkripsi konfigurasi' }
        }

        await prisma.systemSetting.upsert({
            where: { key: RBAC_KEY },
            update: { value: encryptedValue },
            create: { key: RBAC_KEY, value: encryptedValue }
        })

        revalidatePath('/settings')
        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error('Error saving RBAC config:', error)
        return { success: false, error: error.message || 'Gagal menyimpan konfigurasi RBAC' }
    }
}
