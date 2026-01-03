'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { hash } from 'bcryptjs'

export async function getUsers() {
    return await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            email: true,
            username: true,
            department: true,
            role: true,
            createdAt: true,
        }
    })
}

export async function createUser(data: any) {
    const { name, email, username, password, department, role } = data

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email },
                { username }
            ]
        }
    })

    if (existingUser) {
        throw new Error('Email or Username already exists')
    }

    const hashedPassword = await hash(password, 12)

    await prisma.user.create({
        data: {
            name,
            email,
            username,
            password: hashedPassword,
            department,
            role: role || 'USER'
        }
    })

    revalidatePath('/users')
}

export async function updateUser(id: string, data: any) {
    const { name, email, username, password, department, role } = data

    // Check uniqueness if email/username changed
    const existingUser = await prisma.user.findFirst({
        where: {
            AND: [
                { id: { not: id } },
                {
                    OR: [
                        { email },
                        { username }
                    ]
                }
            ]
        }
    })

    if (existingUser) {
        throw new Error('Email or Username already taken')
    }

    const updateData: any = {
        name,
        email,
        username,
        department,
        role
    }

    if (password && password.trim() !== '') {
        updateData.password = await hash(password, 12)
    }

    await prisma.user.update({
        where: { id },
        data: updateData
    })

    revalidatePath('/users')
}

export async function deleteUser(id: string) {
    // Prevent deleting the last admin or self (though self-check requires session)
    // For now, just simple delete
    await prisma.user.delete({
        where: { id }
    })
    revalidatePath('/users')
}

export async function toggleUserRole(id: string) {
    const user = await prisma.user.findUnique({
        where: { id }
    })

    if (!user) throw new Error('User not found')

    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'

    await prisma.user.update({
        where: { id },
        data: { role: newRole }
    })
    revalidatePath('/users')
}
