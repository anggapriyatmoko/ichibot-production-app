'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt } from '@/lib/crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export interface ExpenseData {
    categoryId: string
    date: Date
    amount: string // To be encrypted
    name: string   // To be encrypted
    image?: string
}

export async function getExpenses(userId: string) {
    try {
        const expenses = await (prisma as any).expense.findMany({
            where: { userId },
            include: {
                category: true
            },
            orderBy: [
                { date: 'desc' },
                { createdAt: 'desc' }
            ]
        })

        const decryptedExpenses = expenses.map((expense: any) => ({
            ...expense,
            amount: decrypt(expense.amountEnc) || '0',
            name: decrypt(expense.nameEnc) || 'Unknown'
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
            ...expense,
            amount: decrypt(expense.amountEnc) || '0',
            name: decrypt(expense.nameEnc) || 'Unknown',
            userName: decrypt(expense.user?.nameEnc) || 'Unknown'
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
