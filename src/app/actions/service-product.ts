'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { requireAuth } from '@/lib/auth'
import * as XLSX from 'xlsx'

// Helper to get upload directory
function getUploadDir() {
    let uploadDir = process.env.UPLOAD_DIR
    if (!uploadDir) {
        uploadDir = path.join(process.cwd(), 'uploads')
        if (!fs.existsSync(uploadDir) && fs.existsSync(path.join(process.cwd(), 'public', 'uploads'))) {
            uploadDir = path.join(process.cwd(), 'public', 'uploads')
        }
    }
    return uploadDir
}

// Helper function to delete old image file from storage
async function deleteOldImage(imagePath: string | null) {
    if (!imagePath || !imagePath.startsWith('/api/uploads/')) return

    try {
        const filename = imagePath.replace('/api/uploads/', '')
        const uploadDir = getUploadDir()

        const filePath = path.join(uploadDir, filename)
        if (fs.existsSync(filePath)) {
            await unlink(filePath)
            console.log('Deleted old service product image:', filePath)
        }
    } catch (error) {
        console.error('Could not delete old service product image:', error)
    }
}

async function saveImage(imageFile: File): Promise<string | null> {
    if (!imageFile || imageFile.size === 0) return null

    try {
        const buffer = Buffer.from(await imageFile.arrayBuffer())

        // Resize with Sharp - max 900x900 as per user request
        const resizedBuffer = await sharp(buffer)
            .resize(900, 900, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer()

        const filename = `service-${Date.now()}-${imageFile.name.replace(/\s/g, '-')}`
        const uploadDir = getUploadDir()

        if (!fs.existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true })
        }

        const filePath = path.join(uploadDir, filename)
        await writeFile(filePath, resizedBuffer)

        return `/api/uploads/${filename}`
    } catch (error) {
        console.error('Error saving image:', error)
        return null
    }
}

// Helper to import image from external URL
async function importImageFromUrl(url: string): Promise<string | null> {
    if (!url || !url.startsWith('http')) return null

    try {
        const response = await fetch(url)
        if (!response.ok) return null
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const resizedBuffer = await sharp(buffer)
            .resize(900, 900, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer()

        const urlPath = new URL(url).pathname
        const ext = path.extname(urlPath) || '.jpg'
        const filename = `import-${Date.now()}${ext}`
        const uploadDir = getUploadDir()

        if (!fs.existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true })
        }

        const filePath = path.join(uploadDir, filename)
        await writeFile(filePath, resizedBuffer)

        return `/api/uploads/${filename}`
    } catch (error) {
        console.error('Error importing image from URL:', error, url)
        return null
    }
}

export async function getServiceProducts() {
    try {
        const products = await prisma.serviceProduct.findMany({
            orderBy: { name: 'asc' }
        })
        return { success: true, products }
    } catch (error: any) {
        console.error('Error in getServiceProducts:', error)
        return { success: false, error: 'Gagal mengambil data produk service' }
    }
}

export async function createServiceProduct(formData: FormData) {
    await requireAuth()

    try {
        const name = formData.get('name') as string
        const sku = formData.get('sku') as string || undefined
        const price = parseFloat(formData.get('price') as string)
        const salePrice = formData.get('salePrice') ? parseFloat(formData.get('salePrice') as string) : undefined
        const stock = parseFloat(formData.get('stock') as string) || 0
        const description = formData.get('description') as string || undefined
        const imageFile = formData.get('image') as File | null

        let imagePath = null
        if (imageFile) {
            imagePath = await saveImage(imageFile)
        }

        const product = await prisma.serviceProduct.create({
            data: {
                name,
                sku,
                price,
                salePrice,
                stock,
                description,
                image: imagePath
            }
        })
        revalidatePath('/pos-service')
        return { success: true, product }
    } catch (error: any) {
        console.error('Error in createServiceProduct:', error)
        return { success: false, error: 'Gagal menambahkan produk service' }
    }
}

export async function updateServiceProduct(id: string, formData: FormData) {
    await requireAuth()

    try {
        const existing = await prisma.serviceProduct.findUnique({ where: { id } })

        const name = formData.get('name') as string
        const sku = formData.get('sku') as string || undefined
        const price = parseFloat(formData.get('price') as string)
        const salePrice = formData.get('salePrice') ? parseFloat(formData.get('salePrice') as string) : undefined
        const stock = parseFloat(formData.get('stock') as string) || 0
        const description = formData.get('description') as string || undefined
        const imageFile = formData.get('image') as File | null
        const removeImage = formData.get('removeImage') === 'true'

        let imagePath = existing?.image || null

        if (removeImage) {
            await deleteOldImage(existing?.image || null)
            imagePath = null
        } else if (imageFile && imageFile.size > 0) {
            await deleteOldImage(existing?.image || null)
            imagePath = await saveImage(imageFile)
        }

        const product = await prisma.serviceProduct.update({
            where: { id },
            data: {
                name,
                sku,
                price,
                salePrice,
                stock,
                description,
                image: imagePath
            }
        })
        revalidatePath('/pos-service')
        return { success: true, product }
    } catch (error: any) {
        console.error('Error in updateServiceProduct:', error)
        return { success: false, error: 'Gagal memperbarui produk service' }
    }
}

export async function deleteServiceProduct(id: string) {
    await requireAuth()

    try {
        const existing = await prisma.serviceProduct.findUnique({ where: { id } })
        if (existing?.image) {
            await deleteOldImage(existing.image)
        }

        await prisma.serviceProduct.delete({
            where: { id }
        })
        revalidatePath('/pos-service')
        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteServiceProduct:', error)
        return { success: false, error: 'Gagal menghapus produk service' }
    }
}

export async function exportServiceProducts() {
    await requireAuth()
    try {
        const products = await prisma.serviceProduct.findMany({
            orderBy: { name: 'asc' }
        })

        // Transform data for Excel
        const domain = process.env.NEXTAUTH_URL || ''
        const excelData = products.map((p: any) => ({
            'Nama Produk': p.name,
            'SKU': p.sku || '',
            'Harga': p.price,
            'Harga Promo': p.salePrice || '',
            'Stok': p.stock,
            'Keterangan': p.description || '',
            'Gambar': p.image ? (p.image.startsWith('/') ? `${domain}${p.image}` : p.image) : ''
        }))

        // Create workbook
        const worksheet = XLSX.utils.json_to_sheet(excelData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')

        // Generate base64
        const buffer = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' })

        return { success: true, fileName: `service_products_${new Date().toISOString().split('T')[0]}.xlsx`, content: buffer }
    } catch (error: any) {
        console.error('Error exporting products:', error)
        return { success: false, error: 'Gagal export data produk' }
    }
}

export async function importServiceProducts(base64Data: string) {
    await requireAuth()
    try {
        // Read workbook from base64
        const workbook = XLSX.read(base64Data, { type: 'base64' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[]

        let successCount = 0
        let errorCount = 0

        for (const item of rows) {
            try {
                // Map Excel headers back to fields
                const name = item['Nama Produk']?.toString()
                if (!name) continue

                const sku = item['SKU']?.toString() || null
                const price = parseFloat(item['Harga']) || 0
                const salePrice = item['Harga Promo'] ? parseFloat(item['Harga Promo']) : null
                const stock = parseFloat(item['Stok']) || 0
                const description = item['Keterangan']?.toString() || ''
                const imageUrl = item['Gambar']?.toString()

                let imagePath = null
                if (imageUrl && imageUrl.startsWith('http')) {
                    // Import image from external URL or our own full URL
                    imagePath = await importImageFromUrl(imageUrl)
                } else if (imageUrl && imageUrl.startsWith('/api/uploads/')) {
                    // Keep existing local path
                    imagePath = imageUrl
                }

                // Use SKU or Name to identify existing product
                const existing = sku ?
                    await prisma.serviceProduct.findFirst({ where: { sku } }) :
                    await prisma.serviceProduct.findFirst({ where: { name } })

                if (existing) {
                    await prisma.serviceProduct.update({
                        where: { id: existing.id },
                        data: {
                            name,
                            price,
                            salePrice,
                            stock,
                            description,
                            image: imagePath || existing.image
                        }
                    })
                } else {
                    await prisma.serviceProduct.create({
                        data: {
                            name,
                            sku,
                            price,
                            salePrice,
                            stock,
                            description,
                            image: imagePath
                        }
                    })
                }
                successCount++
            } catch (err) {
                console.error(`Error importing product:`, err)
                errorCount++
            }
        }

        revalidatePath('/pos-service')
        return {
            success: true,
            message: `Import selesai. Berhasil: ${successCount}, Gagal: ${errorCount}`
        }
    } catch (error: any) {
        console.error('Error in importServiceProducts:', error)
        return { success: false, error: 'Gagal import data produk' }
    }
}
