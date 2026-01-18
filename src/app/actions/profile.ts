'use server'

import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { hash, compare } from 'bcryptjs'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
    const session: any = await getServerSession(authOptions)

    if (!session?.user?.id) {
        throw new Error('Unauthorized')
    }

    const userId = session.user.id
    const name = formData.get('name') as string
    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string

    if (!name) {
        throw new Error('Name is required')
    }

    // Get current user data
    const user = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!user) {
        throw new Error('User not found')
    }

    const updateData: any = {}

    // Handle Name Update (Only for ADMIN or HRD)
    if (['ADMIN', 'HRD'].includes(session.user.role) && name) {
        updateData.name = name
    } else if (name && name !== user.name) {
        // Silently ignore or throw error? User request "untuk mengganti nama user tidak bisa" implies restriction.
        // Let's throw reasonable error if they try to hack it, but UI will prevent it.
        if (session.user.role !== 'USER') { // strict check
            // allow if not changing? no.
        }
        // Actually, simpler: just don't add it to updateData if not ADMIN
        // But we should probably error if they try.
        throw new Error('Only Admins can update their name')
    }

    // Handle Password Update
    if (newPassword) {
        if (!currentPassword) {
            throw new Error('Current password is required to set a new password')
        }

        // Verify current password
        const isPasswordValid = await compare(currentPassword, user.password)
        if (!isPasswordValid) {
            throw new Error('Incorrect current password')
        }

        // Hash new password
        const hashedPassword = await hash(newPassword, 12)
        updateData.password = hashedPassword
    }

    await prisma.user.update({
        where: { id: userId },
        data: updateData
    })

    revalidatePath('/dashboard')
    revalidatePath('/profile')
    return { success: true }
}
