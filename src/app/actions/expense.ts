'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt } from '@/lib/crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { requirePageAccess } from '@/lib/auth'

export interface ExpenseData {
    categoryId: string
    date: Date
    amount: string // To be encrypted
    name: string   // To be encrypted
    image?: string
}

export async function getExpenses(userId: string, startDateIso?: string, endDateIso?: string) {
    try {
        const whereClause: any = { userId }
        if (startDateIso && endDateIso) {
            whereClause.date = {
                gte: new Date(startDateIso),
                lte: new Date(endDateIso)
            }
        }

        const expenses = await (prisma as any).expense.findMany({
            where: whereClause,
            include: {
                category: true
            },
            orderBy: [
                { date: 'desc' },
                { createdAt: 'desc' }
            ]
        })

        const decryptedExpenses = expenses.map((expense: any) => ({
            id: expense.id,
            userId: expense.userId,
            categoryId: expense.categoryId,
            date: expense.date,
            status: expense.status,
            createdAt: expense.createdAt,
            updatedAt: expense.updatedAt,
            category: expense.category,
            amount: decrypt(expense.amountEnc) || '0',
            name: decrypt(expense.nameEnc) || 'Unknown',
            hasImage: !!expense.image,
        }))

        return { success: true, data: decryptedExpenses }
    } catch (error) {
        console.error('Error fetching expenses:', error)
        return { success: false, error: 'Failed to fetch expenses' }
    }
}

export async function getAllExpenses(startDateIso?: string, endDateIso?: string) {
    try {
        const whereClause: any = {}
        if (startDateIso && endDateIso) {
            whereClause.date = {
                gte: new Date(startDateIso),
                lte: new Date(endDateIso)
            }
        }

        const expenses = await (prisma as any).expense.findMany({
            where: whereClause,
            include: {
                category: true,
                user: {
                    select: {
                        nameEnc: true
                    }
                }
            },
            orderBy: [
                { date: 'desc' },
                { createdAt: 'desc' }
            ]
        })

        const decryptedExpenses = expenses.map((expense: any) => ({
            id: expense.id,
            userId: expense.userId,
            categoryId: expense.categoryId,
            date: expense.date,
            status: expense.status,
            createdAt: expense.createdAt,
            updatedAt: expense.updatedAt,
            category: expense.category,
            amount: decrypt(expense.amountEnc) || '0',
            name: decrypt(expense.nameEnc) || 'Unknown',
            userName: decrypt(expense.user?.nameEnc) || 'Unknown',
            hasImage: !!expense.image,
        }))

        return { success: true, data: decryptedExpenses }
    } catch (error) {
        console.error('Error fetching all expenses:', error)
        return { success: false, error: 'Failed to fetch all expenses: ' + (error as any).message }
    }
}

export async function createExpense(data: ExpenseData) {
    try {
        const session: any = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const amountEnc = encrypt(data.amount.toString())
        const nameEnc = encrypt(data.name)

        if (!amountEnc || !nameEnc) {
            return { success: false, error: 'Encryption failed' }
        }

        const expense = await (prisma as any).expense.create({
            data: {
                userId: session.user.id,
                categoryId: data.categoryId,
                date: data.date,
                amountEnc,
                nameEnc,
                image: data.image
            }
        })

        revalidatePath('/keuangan/pengeluaran')
        revalidatePath('/keuangan/dashboard')
        return { success: true, data: expense }
    } catch (error) {
        console.error('Error creating expense:', error)
        return { success: false, error: 'Failed to create expense' }
    }
}

export async function updateExpense(id: string, data: ExpenseData) {
    try {
        const session: any = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const amountEnc = encrypt(data.amount.toString())
        const nameEnc = encrypt(data.name)

        if (!amountEnc || !nameEnc) {
            return { success: false, error: 'Encryption failed' }
        }

        const expense = await (prisma as any).expense.update({
            where: {
                id,
                userId: session.user.id // Ensure user owns the expense (for regular users)
                // Admin might need to bypass this if they can edit others' expenses
            },
            data: {
                categoryId: data.categoryId,
                date: data.date,
                amountEnc,
                nameEnc,
                image: data.image
            }
        })

        revalidatePath('/keuangan/pengeluaran')
        revalidatePath('/keuangan/dashboard')
        return { success: true, data: expense }
    } catch (error) {
        console.error('Error updating expense:', error)
        return { success: false, error: 'Failed to update expense' }
    }
}

export async function updateExpenseAdmin(id: string, data: ExpenseData) {
    try {
        const session: any = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        // Verify that the user has access to the financial dashboard (admin equivalent)
        try {
            await requirePageAccess('/keuangan/dashboard')
        } catch (error) {
            return { success: false, error: 'Unauthorized: Admin access required' }
        }

        const amountEnc = encrypt(data.amount.toString())
        const nameEnc = encrypt(data.name)

        if (!amountEnc || !nameEnc) {
            return { success: false, error: 'Encryption failed' }
        }

        const expense = await (prisma as any).expense.update({
            where: {
                id, // No userId check, so Admin can edit any expense
            },
            data: {
                categoryId: data.categoryId,
                date: data.date,
                amountEnc,
                nameEnc,
                image: data.image
            }
        })

        revalidatePath('/keuangan/pengeluaran')
        revalidatePath('/keuangan/dashboard')
        return { success: true, data: expense }
    } catch (error) {
        console.error('Error updating expense as admin:', error)
        return { success: false, error: 'Failed to update expense' }
    }
}

export async function deleteExpense(id: string) {
    try {
        const session: any = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        await (prisma as any).expense.delete({
            where: {
                id,
                userId: session.user.id // Ensure user owns the expense
            }
        })

        revalidatePath('/keuangan/pengeluaran')
        revalidatePath('/keuangan/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting expense:', error)
        return { success: false, error: 'Failed to delete expense' }
    }
}

export async function createExpenseDraft(data: { categoryId: string; date: Date; image: string }) {
    try {
        const session: any = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const nameEnc = encrypt('Sedang memproses...')
        const amountEnc = encrypt('0')

        if (!nameEnc || !amountEnc) {
            return { success: false, error: 'Encryption failed' }
        }

        const expense = await (prisma as any).expense.create({
            data: {
                userId: session.user.id,
                categoryId: data.categoryId,
                date: data.date,
                nameEnc,
                amountEnc,
                image: data.image,
                status: 'scanning',
            }
        })

        revalidatePath('/keuangan/pengeluaran')
        return { success: true, data: expense }
    } catch (error) {
        console.error('Error creating expense draft:', error)
        return { success: false, error: 'Failed to create draft: ' + (error instanceof Error ? error.message : String(error)) }
    }
}

export async function updateExpenseFromScan(id: string, name: string, amount: string) {
    try {
        // Cek apakah expense masih ada (belum dihapus user)
        const existing = await (prisma as any).expense.findUnique({ where: { id } })
        if (!existing) {
            return { success: false, error: 'Expense already deleted' }
        }

        const nameEnc = encrypt(name)
        const amountEnc = encrypt(amount)

        if (!nameEnc || !amountEnc) {
            return { success: false, error: 'Encryption failed' }
        }

        await (prisma as any).expense.update({
            where: { id },
            data: { nameEnc, amountEnc, status: 'draft' }
        })

        revalidatePath('/keuangan/pengeluaran')
        return { success: true }
    } catch (error) {
        console.error('Error updating from scan:', error)
        return { success: false, error: 'Failed to update from scan' }
    }
}

export async function approveExpense(id: string) {
    try {
        const session: any = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        await (prisma as any).expense.update({
            where: { id, userId: session.user.id },
            data: { status: 'approved' }
        })

        revalidatePath('/keuangan/pengeluaran')
        revalidatePath('/keuangan/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error approving expense:', error)
        return { success: false, error: 'Failed to approve expense' }
    }
}

export async function getAllExpensesForYear(year: number, categoryIds?: string[]) {
    try {
        await requirePageAccess('/keuangan/dashboard')
        
        const startDate = new Date(year, 0, 1)
        const endDate = new Date(year, 11, 31, 23, 59, 59, 999)

        const whereClause: any = {
            date: {
                gte: startDate,
                lte: endDate
            }
        }
        
        if (categoryIds !== undefined) {
            whereClause.categoryId = { in: categoryIds }
        }

        const expenses = await (prisma as any).expense.findMany({
            where: whereClause,
            select: {
                date: true,
                amountEnc: true
            }
        })

        const decryptedExpenses = expenses.map((expense: any) => ({
            date: expense.date,
            amount: decrypt(expense.amountEnc) || '0'
        }))

        return { success: true, data: decryptedExpenses }
    } catch (error) {
        console.error('Error fetching yearly expenses:', error)
        return { success: false, error: 'Failed to fetch yearly expenses: ' + (error as any).message }
    }
}

export async function getExpenseImage(id: string) {
    try {
        const session: any = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const expense = await (prisma as any).expense.findUnique({
            where: { id },
            select: { image: true, userId: true }
        })

        if (!expense) {
            return { success: false, error: 'Expense not found' }
        }

        return { success: true, data: expense.image }
    } catch (error) {
        console.error('Error fetching expense image:', error)
        return { success: false, error: 'Failed to fetch image' }
    }
}
