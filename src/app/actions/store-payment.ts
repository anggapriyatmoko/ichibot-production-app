'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import {
    getDokuBaseUrl,
    DOKU_CHECKOUT_PATH,
    DOKU_STATUS_PATH,
    generateRequestHeaders,
} from '@/lib/doku'

async function generateInvoiceNumber(): Promise<string> {
    // Gunakan waktu Jakarta (GMT+7)
    const jakartaTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
    const month = romanMonths[jakartaTime.getMonth()]

    const startOfMonth = new Date(jakartaTime.getFullYear(), jakartaTime.getMonth(), 1)
    const endOfMonth = new Date(jakartaTime.getFullYear(), jakartaTime.getMonth() + 1, 0, 23, 59, 59, 999)

    const count = await prisma.storePayment.count({
        where: {
            createdAt: {
                gte: startOfMonth,
                lte: endOfMonth,
            },
        },
    })
    const nomor = (count + 1).toString().padStart(4, '0')
    return `INV/ICBT-DK/${month}/${nomor}`
}

export async function createPayment(data: {
    nama: string
    keterangan?: string
    nominal: number
    paymentDueMinutes?: number
}) {
    try {
        const invoiceNumber = await generateInvoiceNumber()
        const dokuBody = {
            order: {
                amount: data.nominal,
                invoice_number: invoiceNumber,
            },
            payment: {
                payment_due_date: data.paymentDueMinutes || 60,
            },
            customer: {
                name: data.nama,
            },
        }

        const headers = generateRequestHeaders({
            requestTarget: DOKU_CHECKOUT_PATH,
            body: dokuBody,
        })

        const baseUrl = getDokuBaseUrl()
        console.log('DOKU Request URL:', `${baseUrl}${DOKU_CHECKOUT_PATH}`)
        console.log('DOKU Request Headers:', JSON.stringify(headers, null, 2))
        console.log('DOKU Request Body:', JSON.stringify(dokuBody, null, 2))
        const response = await fetch(`${baseUrl}${DOKU_CHECKOUT_PATH}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(dokuBody),
        })

        const result = await response.json()

        console.log('DOKU Response Status:', response.status)
        console.log('DOKU Response Body:', JSON.stringify(result, null, 2))

        if (!response.ok) {
            const errorDetail = result.error_messages?.join(', ') || result.message || JSON.stringify(result)
            console.error('DOKU Error:', errorDetail)
            return {
                success: false,
                error: `DOKU error: ${response.status} - ${errorDetail}`,
            }
        }

        const paymentUrl = result.response?.payment?.url
        const tokenId = result.response?.payment?.token_id
        const sessionId = result.response?.order?.session_id
        const dokuRequestId = headers['Request-Id']

        const payment = await prisma.storePayment.create({
            data: {
                invoiceNumber,
                nama: data.nama,
                keterangan: data.keterangan || null,
                nominal: data.nominal,
                status: 'pending',
                paymentUrl,
                tokenId,
                sessionId,
                dokuRequestId,
                dokuResponse: result,
            },
        })

        revalidatePath('/store/payment')
        return {
            success: true,
            data: {
                id: payment.id,
                invoiceNumber,
                paymentUrl,
            },
        }
    } catch (error: any) {
        console.error('createPayment error:', error)
        return { success: false, error: error.message || 'Gagal membuat payment' }
    }
}

export async function getPayments() {
    try {
        const payments = await prisma.storePayment.findMany({
            orderBy: { createdAt: 'desc' },
        })

        return {
            success: true,
            data: payments.map((p) => ({
                id: p.id,
                invoiceNumber: p.invoiceNumber,
                nama: p.nama,
                tanggal: p.createdAt.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }),
                keterangan: p.keterangan || '',
                nominal: p.nominal,
                status: p.status as 'pending' | 'lunas' | 'gagal' | 'expired',
                paymentUrl: p.paymentUrl || undefined,
            })),
        }
    } catch (error: any) {
        console.error('getPayments error:', error)
        return { success: false, error: error.message, data: [] }
    }
}

export async function checkPaymentStatus(invoiceNumber: string) {
    try {
        const requestTarget = `${DOKU_STATUS_PATH}${invoiceNumber}`
        const headers = generateRequestHeaders({ requestTarget })

        const baseUrl = getDokuBaseUrl()
        const response = await fetch(`${baseUrl}${requestTarget}`, {
            method: 'GET',
            headers: {
                'Client-Id': headers['Client-Id'],
                'Request-Id': headers['Request-Id'],
                'Request-Timestamp': headers['Request-Timestamp'],
                'Signature': headers['Signature'],
            },
        })

        const result = await response.json()

        if (!response.ok) {
            return { success: false, error: `DOKU status check failed: ${response.status}` }
        }

        const dokuStatus = result.transaction?.status || result.response?.transaction?.status
        let localStatus: string | undefined

        if (dokuStatus === 'SUCCESS') localStatus = 'lunas'
        else if (dokuStatus === 'FAILED') localStatus = 'gagal'
        else if (dokuStatus === 'EXPIRED') localStatus = 'expired'

        if (localStatus) {
            await prisma.storePayment.update({
                where: { invoiceNumber },
                data: {
                    status: localStatus,
                    paidAt: localStatus === 'lunas' ? new Date() : undefined,
                    paymentMethod: result.transaction?.payment_method || result.response?.acquirer?.id,
                    paymentChannel: result.transaction?.payment_channel || result.response?.channel?.id,
                },
            })
        }

        revalidatePath('/store/payment')
        return { success: true, data: { status: localStatus || 'pending', dokuStatus } }
    } catch (error: any) {
        console.error('checkPaymentStatus error:', error)
        return { success: false, error: error.message }
    }
}

export async function deletePayment(id: string) {
    try {
        const payment = await prisma.storePayment.findUnique({ where: { id } })
        if (!payment) {
            return { success: false, error: 'Payment tidak ditemukan' }
        }
        if (payment.status !== 'pending' && payment.status !== 'expired') {
            return { success: false, error: 'Hanya payment pending/expired yang bisa dihapus' }
        }

        await prisma.storePayment.delete({ where: { id } })
        revalidatePath('/store/payment')
        return { success: true }
    } catch (error: any) {
        console.error('deletePayment error:', error)
        return { success: false, error: error.message }
    }
}
