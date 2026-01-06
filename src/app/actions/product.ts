'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function createProduct(formData: FormData) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    const name = formData.get('name') as string
    const rawSku = formData.get('sku') as string
    const sku = rawSku && rawSku.trim() !== '' ? rawSku.trim() : null
    const stock = parseFloat(formData.get('stock') as string)
    const lowStockThreshold = parseFloat(formData.get('lowStockThreshold') as string)
    const notes = formData.get('notes') as string | null
    const imageFile = formData.get('image') as File | null

    let imagePath = null

    if (imageFile && imageFile.size > 0) {
        const buffer = Buffer.from(await imageFile.arrayBuffer())

        // Resize with Sharp
        const resizedBuffer = await sharp(buffer)
            .resize(700, 700, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer()

        const filename = Date.now() + '-' + imageFile.name.replace(/\s/g, '-')
        const uploadDir = path.join(process.cwd(), 'public', 'uploads')

        // Ensure directory exists
        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) { }

        await writeFile(path.join(uploadDir, filename), resizedBuffer)
        imagePath = '/uploads/' + filename
    }

    try {
        const product = await prisma.product.create({
            data: {
                name,
                sku: sku as any,
                stock,
                lowStockThreshold,
                notes,
                image: imagePath
            }
        })

        // Create transaction record if initial stock > 0
        if (stock > 0) {
            await prisma.transaction.create({
                data: {
                    type: 'IN',
                    quantity: stock,
                    productId: product.id,
                    userId: session?.user?.id || null,
                    description: 'Initial Stock'
                }
            })
            console.log('Transaction created with userId:', session?.user?.id || 'system')
        }
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
            return { error: `SKU '${sku}' already exists.` }
        }
        return { error: error.message }
    }

    revalidatePath('/inventory')
    revalidatePath('/history')
    return { success: true }
}

export async function updateProduct(formData: FormData) {
    await requireAuth()
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const rawSku = formData.get('sku') as string
    const sku = rawSku && rawSku.trim() !== '' ? rawSku.trim() : null
    const lowStockThreshold = parseFloat(formData.get('lowStockThreshold') as string)
    const notes = formData.get('notes') as string | null
    const imageFile = formData.get('image') as File | null

    const data: any = {
        name,
        sku,
        lowStockThreshold,
        notes
    }

    if (imageFile && imageFile.size > 0) {
        const buffer = Buffer.from(await imageFile.arrayBuffer())

        // Resize with Sharp
        const resizedBuffer = await sharp(buffer)
            .resize(700, 700, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer()

        const filename = Date.now() + '-' + imageFile.name.replace(/\s/g, '-')
        const uploadDir = path.join(process.cwd(), 'public', 'uploads')

        try { await mkdir(uploadDir, { recursive: true }) } catch (e) { }

        await writeFile(path.join(uploadDir, filename), resizedBuffer)
        data.image = '/uploads/' + filename
    }

    if (formData.get('removeImage') === 'true') {
        data.image = null
    }

    try {
        await prisma.product.update({
            where: { id },
            data
        })
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
            return { error: `SKU '${sku}' already exists.` }
        }
        return { error: error.message }
    }

    revalidatePath('/inventory')
    return { success: true }
}


export async function addStock(productId: string, quantity: number) {
    const session: any = await getServerSession(authOptions)

    console.log('=== ADD STOCK DEBUG ===')
    console.log('Session:', JSON.stringify(session, null, 2))
    console.log('User ID:', session?.user?.id)
    console.log('User:', session?.user)

    await prisma.$transaction([
        prisma.product.update({
            where: { id: productId },
            data: { stock: { increment: quantity } }
        }),
        prisma.transaction.create({
            data: {
                type: 'IN',
                quantity: quantity,
                productId: productId,
                userId: session?.user?.id || null,
                description: 'Manual Stock Addition'
            }
        })
    ])

    console.log('Transaction created with userId:', session?.user?.id)

    revalidatePath('/inventory')
    revalidatePath('/history')
}

export async function deleteProduct(id: string) {
    await requireAdmin()
    await prisma.product.delete({
        where: { id }
    })
    revalidatePath('/inventory')
}

export async function importProducts(products: any[]) {
    await requireAdmin()
    const session: any = await getServerSession(authOptions)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const item of products) {
        try {
            // Validation: Name is required. SKU is optional.
            if (!item.name) {
                errorCount++
                errors.push(`Row missing name: ${JSON.stringify(item)}`)
                continue
            }

            const itemSku = item.sku ? String(item.sku).trim() : null
            const sku = itemSku === '' ? null : itemSku
            const name = String(item.name).trim()
            const stock = item.stock ? parseFloat(item.stock) : 0
            const lowStockThreshold = item.lowStockThreshold ? parseFloat(item.lowStockThreshold) : 10

            // Check existing logic: Priority SKU -> Name
            let existing = null

            if (sku) {
                existing = await prisma.product.findUnique({
                    where: { sku }
                })
            }

            if (!existing) {
                // Determine uniqueness by Name if SKU not found or not provided
                existing = await prisma.product.findFirst({
                    where: { name }
                })
            }

            if (existing) {
                // Update
                const updateData: any = {
                    name,
                    stock: stock,
                    lowStockThreshold,
                    image: item.image ? String(item.image).trim() : existing.image
                }

                // Only update SKU if provided and not empty
                if (sku) {
                    updateData.sku = sku
                }
                // If excel SKU is empty, we DO NOT clear the existing SKU. Preserve it.

                await prisma.product.update({
                    where: { id: existing.id },
                    data: updateData
                })

                const diff = stock - existing.stock
                if (diff !== 0) {
                    await prisma.transaction.create({
                        data: {
                            type: diff > 0 ? 'IN' : 'OUT',
                            quantity: Math.abs(diff),
                            productId: existing.id,
                            userId: session?.user?.id || null,
                            description: `Import Adjustment (${diff > 0 ? '+' : ''}${diff})`
                        }
                    })
                }

            } else {
                // Create
                const newProduct = await prisma.product.create({
                    data: {
                        name,
                        sku: sku as any, // can be null
                        stock,
                        lowStockThreshold,
                        image: item.image ? String(item.image).trim() : null
                    }
                })

                if (stock > 0) {
                    await prisma.transaction.create({
                        data: {
                            type: 'IN',
                            quantity: stock,
                            productId: newProduct.id,
                            userId: session?.user?.id || null,
                            description: 'Import Initial Stock'
                        }
                    })
                }
            }
            successCount++

        } catch (error: any) {
            errorCount++
            errors.push(`Failed to import item ${item.name}: ${error.message}`)
        }
    }

    revalidatePath('/inventory')
    revalidatePath('/history')

    return { success: successCount, errors }
}

export async function getAllProductsForExport() {
    await requireAdmin()
    return await prisma.product.findMany({
        orderBy: { name: 'asc' },
        select: {
            name: true,
            sku: true,
            stock: true,
            lowStockThreshold: true,
            notes: true,
            image: true
        }
    })
}
