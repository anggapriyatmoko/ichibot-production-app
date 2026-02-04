'use server'

import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { hash as hashPassword, compare } from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt, hash } from '@/lib/crypto'

export async function updateProfile(formData: FormData) {
    const session: any = await getServerSession(authOptions)

    if (!session?.user?.id) {
        throw new Error('Unauthorized')
    }

    const userId = session.user.id
    const name = formData.get('name') as string | null
    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string

    // Get current user data
    const user = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!user) {
        throw new Error('User not found')
    }

    const updateData: any = {}

    // Handle Name Update (Only for ADMIN, HRD, or ADMINISTRASI)
    if (['ADMIN', 'HRD', 'ADMINISTRASI'].includes(session.user.role)) {
        // If name is provided by ADMIN, validate it
        if (name !== null && name !== undefined) {
            if (!name.trim()) {
                throw new Error('Name cannot be empty')
            }
            updateData.nameEnc = encrypt(name)
        }
    } else if (name !== null && name !== decrypt(user.nameEnc)) {
        // Non-admin users trying to change their name
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
        const hashedPassword = await hashPassword(newPassword, 12)
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

// Update user's PIN
export async function updatePin(currentPassword: string, newPin: string) {
    const session: any = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' }
    }

    const userId = session.user.id

    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(newPin)) {
        return { success: false, error: 'PIN harus 4-6 digit angka' }
    }

    // Get current user data
    const user = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!user) {
        return { success: false, error: 'User not found' }
    }

    // Verify current password
    const isPasswordValid = await compare(currentPassword, user.password)
    if (!isPasswordValid) {
        return { success: false, error: 'Password salah' }
    }

    // Encrypt and save new PIN
    await prisma.user.update({
        where: { id: userId },
        data: {
            pinEnc: encrypt(newPin)
        }
    })

    revalidatePath('/profile')
    return { success: true }
}

// Get current user's PIN status (has PIN or not)
export async function getMyPinStatus() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return { hasPin: false }
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { pinEnc: true }
    })

    return { hasPin: !!user?.pinEnc }
}

// Verify user's password (for protected page access)
export async function verifyUserPassword(password: string): Promise<{ success: boolean; error?: string }> {
    const session: any = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' }
    }

    // Try to find user by ID first
    let user = await prisma.user.findUnique({
        where: { id: session.user.id }
    })

    // If not found by ID, try by email as fallback (in case session ID is outdated)
    if (!user && session.user.email) {
        user = await prisma.user.findFirst({
            where: { emailHash: hash(session.user.email) }
        })
    }

    if (!user) {
        return { success: false, error: 'User not found' }
    }

    const isPasswordValid = await compare(password, user.password)

    if (!isPasswordValid) {
        return { success: false, error: 'Password salah' }
    }

    return { success: true }
}

// Get user's personal data for display (read-only)
export async function getMyProfileData() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return null
    }

    // Try to find user by ID first
    let user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            nameEnc: true,
            emailEnc: true,
            departmentEnc: true,
            photoEnc: true,
            phoneEnc: true,
            addressEnc: true,
            ktpNumberEnc: true,
            contractEndDateEnc: true,
        }
    })

    // If not found by ID, try by email as fallback
    if (!user && session.user.email) {
        user = await prisma.user.findFirst({
            where: { emailHash: hash(session.user.email) },
            select: {
                id: true,
                nameEnc: true,
                emailEnc: true,
                departmentEnc: true,
                photoEnc: true,
                phoneEnc: true,
                addressEnc: true,
                ktpNumberEnc: true,
                contractEndDateEnc: true,
            }
        })
    }

    if (!user) return null

    // Decrypt data
    const decryptedUser = {
        id: user.id,
        name: decrypt(user.nameEnc),
        email: decrypt(user.emailEnc),
        department: decrypt(user.departmentEnc),
        photo: decrypt(user.photoEnc),
        phone: decrypt(user.phoneEnc),
        address: decrypt(user.addressEnc),
        ktpNumber: decrypt(user.ktpNumberEnc),
        contractEndDate: decrypt(user.contractEndDateEnc),
    }

    return decryptedUser
}

// Get user's payroll data for the current month (read-only)
export async function getMyPayrollData(month?: number, year?: number) {
    const session: any = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return null
    }

    let userId = session.user.id

    // Check if user exists with this ID, fallback to email if not
    const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
    })

    if (!userExists && session.user?.email) {
        const emailHash = hash(session.user.email)
        if (emailHash) {
            const userByEmail = await prisma.user.findUnique({
                where: { emailHash },
                select: { id: true }
            })
            if (userByEmail) {
                userId = userByEmail.id
            }
        }
    }

    const targetMonth = month || new Date().getMonth() + 1
    const targetYear = year || new Date().getFullYear()
    const monthYearHash = hash(`${targetMonth}-${targetYear}`) || ''

    const payroll = await prisma.payroll.findUnique({
        where: {
            userId_monthYearHash: {
                userId: userId,
                monthYearHash
            }
        },
        include: {
            payrollitem: {
                include: {
                    salarycomponent: true
                }
            }
        }
    })

    if (!payroll) return null

    // Decrypt salary data
    const decryptedPayroll = {
        id: payroll.id,
        month: decryptNumber(payroll.monthEnc),
        year: decryptNumber(payroll.yearEnc),
        basicSalary: decryptNumber(payroll.basicSalaryEnc),
        netSalary: decryptNumber(payroll.netSalaryEnc),
        salarySlip: decrypt(payroll.salarySlipEnc),
        items: payroll.payrollitem.map(item => ({
            id: item.id,
            componentId: item.componentId,
            componentName: decrypt(item.salarycomponent.nameEnc) || '',
            componentType: decrypt(item.salarycomponent.typeEnc) || '',
            amount: decryptNumber(item.amountEnc)
        }))
    }

    return decryptedPayroll
}

// Helper to decrypt number
function decryptNumber(encryptedValue: string | null | undefined): number {
    const decrypted = decrypt(encryptedValue)
    return decrypted ? parseFloat(decrypted) : 0
}

