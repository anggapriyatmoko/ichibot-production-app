import { NextRequest, NextResponse } from 'next/server'
import { updateExpenseFromScan } from '@/app/actions/expense'

export async function POST(req: NextRequest) {
    try {
        const { expenseId, imageBase64 } = await req.json()

        if (!expenseId || !imageBase64) {
            return NextResponse.json({ error: 'Missing expenseId or imageBase64' }, { status: 400 })
        }

        // Convert base64 to blob for multipart upload
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        const blob = new Blob([buffer], { type: 'image/jpeg' })

        const formData = new FormData()
        formData.append('file', blob, 'receipt.jpg')

        // Send to Python AI API (URL includes secret as query param)
        const scanApiUrl = process.env.SCAN_API_URL
        if (!scanApiUrl) {
            await updateExpenseFromScan(expenseId, 'Gagal scan - SCAN_API_URL belum diset', '0')
            return NextResponse.json({ error: 'SCAN_API_URL not configured' }, { status: 500 })
        }

        const response = await fetch(scanApiUrl, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            // AI failed — update status to draft with placeholder
            await updateExpenseFromScan(expenseId, 'Gagal scan - isi manual', '0')
            return NextResponse.json({ error: 'AI scan failed' }, { status: 502 })
        }

        const data = await response.json()
        const extraction = data.extraction

        if (extraction && typeof extraction === 'object' && !extraction.error) {
            const name = extraction.toko || 'Unknown'
            const amount = String(extraction.total || 0)
            await updateExpenseFromScan(expenseId, name, amount)
            return NextResponse.json({ success: true, extraction })
        } else {
            await updateExpenseFromScan(expenseId, 'Gagal scan - isi manual', '0')
            return NextResponse.json({ error: 'No extraction data' }, { status: 422 })
        }
    } catch (error) {
        console.error('Scan receipt error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
