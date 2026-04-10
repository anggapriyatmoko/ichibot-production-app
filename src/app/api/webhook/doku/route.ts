import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyDokuSignature } from '@/lib/doku'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const rawBody = await request.text()

        const clientId = request.headers.get('client-id') || request.headers.get('Client-Id') || ''
        const requestId = request.headers.get('request-id') || request.headers.get('Request-Id') || ''
        const requestTimestamp = request.headers.get('request-timestamp') || request.headers.get('Request-Timestamp') || ''
        const receivedSignature = request.headers.get('signature') || request.headers.get('Signature') || ''

        const isValid = verifyDokuSignature({
            clientId,
            requestId,
            requestTimestamp,
            requestTarget: '/api/webhook/doku',
            rawBody,
            receivedSignature,
        })

        if (!isValid) {
            console.error('DOKU webhook: invalid signature')
            return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
        }

        const payload = JSON.parse(rawBody)

        const invoiceNumber = payload.order?.invoice_number
        const dokuStatus = payload.transaction?.status
        const acquirer = payload.acquirer?.id
        const channel = payload.channel?.id

        if (!invoiceNumber) {
            return NextResponse.json({ message: 'Missing invoice_number' }, { status: 400 })
        }

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
                    paymentMethod: acquirer || undefined,
                    paymentChannel: channel || undefined,
                    dokuResponse: payload,
                },
            })

            try {
                revalidatePath('/store/payment')
            } catch {
                // revalidatePath may not work in API routes in some Next.js versions
            }
        }

        return NextResponse.json({ message: 'OK' }, { status: 200 })
    } catch (error: any) {
        console.error('DOKU webhook error:', error)
        // Return 200 to prevent DOKU from retrying on processing errors
        return NextResponse.json({ message: 'Processed with error' }, { status: 200 })
    }
}
