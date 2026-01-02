'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function createProduct(formData: FormData) {
    const name = formData.get('name') as string
    const sku = formData.get('sku') as string
    const stock = parseInt(formData.get('stock') as string)
    const lowStockThreshold = parseInt(formData.get('lowStockThreshold') as string)
    const imageFile = formData.get('image') as File | null

    let imagePath = null

    if (imageFile && imageFile.size > 0) {
        const buffer = Buffer.from(await imageFile.arrayBuffer())
        const filename = Date.now() + '-' + imageFile.name.replace(/\s/g, '-')
        const uploadDir = path.join(process.cwd(), 'public', 'uploads')

        // Ensure directory exists
        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) { }

        await writeFile(path.join(uploadDir, filename), buffer)
        imagePath = '/uploads/' + filename
    }

    await prisma.product.create({
        data: {
            name,
            sku,
            stock,
            lowStockThreshold,
            image: imagePath
        }
    })

    revalidatePath('/inventory')
}

export async function addStock(productId: string, quantity: number) {
    await prisma.$transaction([
        prisma.product.update({
            where: { id: productId },
            data: { stock: { increment: quantity } }
        }),
        prisma.transaction.create({
            data: {
                type: 'IN',
                quantity: quantity,
                productId: productId
            }
        })
    ])
    revalidatePath('/inventory')
}

export async function deleteProduct(id: string) {
    await prisma.product.delete({
        where: { id }
    })
    revalidatePath('/inventory')
}
