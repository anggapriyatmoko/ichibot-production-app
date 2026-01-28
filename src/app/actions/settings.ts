'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'

export async function getSystemSetting(key: string) {
    const setting = await prisma.systemSetting.findUnique({
        where: { key }
    })
    return setting?.value
}

export async function setSystemSetting(key: string, value: string) {
    await requireAdmin()

    try {
        await prisma.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        })
        revalidatePath('/hr-settings')
        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error('Error setting system setting:', error)
        return { error: error.message }
    }
}
