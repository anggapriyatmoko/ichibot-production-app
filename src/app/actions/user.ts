'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { hash as hashPassword } from 'bcryptjs'
import { encrypt, decrypt, hash } from '@/lib/crypto'

export async function getUsers() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            nameEnc: true,
            emailEnc: true,
            usernameEnc: true,
            departmentEnc: true,
            roleEnc: true,
            createdAt: true,
        }
    })

    return users.map(user => ({
        ...user,
        name: decrypt(user.nameEnc),
        email: decrypt(user.emailEnc),
        username: decrypt(user.usernameEnc),
        department: decrypt(user.departmentEnc),
        role: decrypt(user.roleEnc) || 'USER'
    }))
}

export async function createUser(data: any) {
    const { name, email, username, password, pin, department, role } = data

    const emailHash = hash(email)
    const usernameHash = hash(username)

    if (!emailHash || !usernameHash) throw new Error('Invalid email or username')

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { emailHash },
                { usernameHash }
            ]
        }
    })

    if (existingUser) {
        throw new Error('Email or Username already exists')
    }

    const hashedPassword = await hashPassword(password, 12)

    // Validate PIN if provided
    if (pin && !/^\d{4,6}$/.test(pin)) {
        throw new Error('PIN harus 4-6 digit angka')
    }

    await (prisma.user as any).create({
        data: {
            nameEnc: encrypt(name),
            emailEnc: encrypt(email),
            emailHash,
            usernameEnc: encrypt(username),
            usernameHash,
            password: hashedPassword,
            pinEnc: pin ? encrypt(pin) : null,
            departmentEnc: encrypt(department),
            roleEnc: encrypt(role || 'USER')
        }
    })

    revalidatePath('/users')
}

export async function updateUser(id: string, data: any) {
    const { name, email, username, password, pin, department, role } = data

    const emailHash = hash(email)
    const usernameHash = hash(username)

    if (!emailHash || !usernameHash) throw new Error('Invalid email or username')

    // Check uniqueness if email/username changed
    const existingUser = await prisma.user.findFirst({
        where: {
            AND: [
                { id: { not: id } },
                {
                    OR: [
                        { emailHash },
                        { usernameHash }
                    ]
                }
            ]
        }
    })

    if (existingUser) {
        throw new Error('Email or Username already taken')
    }

    const updateData: any = {
        nameEnc: encrypt(name),
        emailEnc: encrypt(email),
        emailHash,
        usernameEnc: encrypt(username),
        usernameHash,
        departmentEnc: encrypt(department),
        roleEnc: encrypt(role)
    }

    if (password && password.trim() !== '') {
        updateData.password = await hashPassword(password, 12)
    }

    // Handle PIN update
    if (pin && pin.trim() !== '') {
        if (!/^\d{4,6}$/.test(pin)) {
            throw new Error('PIN harus 4-6 digit angka')
        }
        updateData.pinEnc = encrypt(pin)
    }

    await (prisma.user as any).update({
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

    const newRole = (decrypt(user.roleEnc)) === 'ADMIN' ? 'USER' : 'ADMIN'

    await prisma.user.update({
        where: { id },
        data: {
            roleEnc: encrypt(newRole)
        }
    })
    revalidatePath('/users')
}
