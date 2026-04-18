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

/**
 * Paginated bank account list — follows the project standard in
 * `standard-table-get-data.md`. Bank accounts are typically few (<50) and
 * bank name is stored encrypted, so we don't expose a search field.
 *
 * The response includes a `totals` aggregate (total balance in IDR + per-
 * currency breakdown) computed from ALL accounts — not just the current
 * page — so the summary cards stay correct even when pagination activates.
 */
export async function getBankAccountsPaginated(params: {
    page?: number
    perPage?: number
    kursYuan?: number
    kursUsd?: number
}) {
    const page = Math.max(1, params.page ?? 1)
    const perPage = Math.max(1, Math.min(200, params.perPage ?? 50))
    const kursYuan = params.kursYuan ?? 0
    const kursUsd = params.kursUsd ?? 0

    try {
        const [totalCount, allAccounts, pageAccounts] = await Promise.all([
            prisma.bankAccount.count(),
            // Fetch all rows for the totals aggregate. Safe because bank
            // accounts are a naturally-small table (tens of rows).
            prisma.bankAccount.findMany({
                orderBy: { updatedAt: 'desc' },
                select: {
                    balanceEnc: true,
                    currency: true,
                },
            }),
            prisma.bankAccount.findMany({
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * perPage,
                take: perPage,
            }),
        ])

        // Totals are always computed from ALL rows so summary cards stay
        // correct when the user navigates between pages.
        let idrTotal = 0, usdTotal = 0, cnyTotal = 0
        let idrCount = 0, usdCount = 0, cnyCount = 0
        for (const a of allAccounts as any[]) {
            const bal = decryptNumber(a.balanceEnc)
            const cur = a.currency || 'IDR'
            if (cur === 'USD') { usdTotal += bal; usdCount++ }
            else if (cur === 'CNY') { cnyTotal += bal; cnyCount++ }
            else { idrTotal += bal; idrCount++ }
        }
        const totals = {
            idr: { total: idrTotal, totalIdr: idrTotal, count: idrCount },
            usd: { total: usdTotal, totalIdr: usdTotal * kursUsd, count: usdCount },
            cny: { total: cnyTotal, totalIdr: cnyTotal * kursYuan, count: cnyCount },
            totalBalanceIdr: idrTotal + (usdTotal * kursUsd) + (cnyTotal * kursYuan),
        }

        const items: BankAccountData[] = (pageAccounts as any[]).map((account) => ({
            id: account.id,
            bankName: decrypt(account.bankNameEnc) || 'Unknown Bank',
            accountNumber: decrypt(account.accountNumberEnc) || '',
            accountName: decrypt(account.accountNameEnc) || '',
            balance: decryptNumber(account.balanceEnc),
            currency: account.currency || 'IDR',
            updatedAt: account.updatedAt,
        }))

        return {
            items,
            totalCount,
            totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
            page,
            perPage,
            totals,
        }
    } catch (error) {
        console.error('Failed to get paginated bank accounts:', error)
        return {
            items: [] as BankAccountData[],
            totalCount: 0,
            totalPages: 1,
            page,
            perPage,
            totals: {
                idr: { total: 0, totalIdr: 0, count: 0 },
                usd: { total: 0, totalIdr: 0, count: 0 },
                cny: { total: 0, totalIdr: 0, count: 0 },
                totalBalanceIdr: 0,
            },
        }
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
