'use server'

import prisma from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'

export type BankAccountData = {
    id: string
    bankName: string
    accountNumber: string
    accountName: string
    balance: number
    currency: string
    updatedAt: Date
}

// Helpers for specific data types
function encryptNumber(value: number): string {
    return encrypt(value.toString()) || ''
}

function decryptNumber(encryptedValue: string | null | undefined): number {
    const decrypted = decrypt(encryptedValue)
    if (!decrypted) return 0
    const parsed = parseFloat(decrypted)
    return isNaN(parsed) ? 0 : parsed
}

export async function getBankAccounts(): Promise<BankAccountData[]> {
    try {
        const accounts = await prisma.bankAccount.findMany({
            orderBy: {
                updatedAt: 'desc'
            }
        })

        return accounts.map((account: any) => ({
            id: account.id,
            bankName: decrypt(account.bankNameEnc) || 'Unknown Bank',
            accountNumber: decrypt(account.accountNumberEnc) || '',
            accountName: decrypt(account.accountNameEnc) || '',
            balance: decryptNumber(account.balanceEnc),
            currency: account.currency || 'IDR',
            updatedAt: account.updatedAt
        }))
    } catch (error) {
        console.error('Failed to get bank accounts:', error)
        return []
    }
}

export async function createBankAccount(data: {
    bankName: string,
    accountNumber: string,
    accountName: string,
    balance: number,
    currency: string
}) {
    try {
        await prisma.bankAccount.create({
            data: {
                bankNameEnc: encrypt(data.bankName) || '',
                accountNumberEnc: encrypt(data.accountNumber) || '',
                accountNameEnc: encrypt(data.accountName) || '',
                balanceEnc: encryptNumber(data.balance),
                currency: data.currency
            }
        })

        revalidatePath('/keuangan/ringkasan-akun')
        return { success: true }
    } catch (error) {
        console.error('Failed to create bank account:', error)
        return { success: false, error: 'Gagal membuat akun bank' }
    }
}

export async function updateBankAccount(id: string, data: {
    bankName: string,
    accountNumber: string,
    accountName: string,
    balance: number,
    currency: string
}) {
    try {
        await prisma.bankAccount.update({
            where: { id },
            data: {
                bankNameEnc: encrypt(data.bankName) || '',
                accountNumberEnc: encrypt(data.accountNumber) || '',
                accountNameEnc: encrypt(data.accountName) || '',
                balanceEnc: encryptNumber(data.balance),
                currency: data.currency
            }
        })

        revalidatePath('/keuangan/ringkasan-akun')
        return { success: true }
    } catch (error) {
        console.error('Failed to update bank account:', error)
        return { success: false, error: 'Gagal memperbarui akun bank' }
    }
}

export async function deleteBankAccount(id: string) {
    try {
        await prisma.bankAccount.delete({
            where: { id }
        })

        revalidatePath('/keuangan/ringkasan-akun')
        return { success: true }
    } catch (error) {
        console.error('Failed to delete bank account:', error)
        return { success: false, error: 'Gagal menghapus akun bank' }
    }
}
