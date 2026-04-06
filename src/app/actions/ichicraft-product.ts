'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import path from 'path'
import { mkdir, unlink } from 'fs/promises'

const REVALIDATE_PATH = '/ichicraft/product'

// ============================================================================
// CATEGORIES
// ============================================================================

export async function getIchicraftCategories() {
    try {
        const categories = await prisma.ichicraftCategory.findMany({
            include: {
                products: {
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'asc' }
        })
        return { success: true, data: categories }
    } catch (error) {
        console.error('Error fetching ichicraft categories:', error)
        return { success: false, error: 'Failed to fetch categories' }
    }
}

export async function createIchicraftCategory(data: { name: string }) {
    try {
        const existing = await prisma.ichicraftCategory.findUnique({
            where: { name: data.name }
        })

        if (existing) {
            return { success: false, error: 'Kategori dengan nama ini sudah ada' }
        }

        const category = await prisma.ichicraftCategory.create({
            data: { name: data.name }
        })

        revalidatePath(REVALIDATE_PATH)
        return { success: true, data: category }
    } catch (error) {
        console.error('Error creating ichicraft category:', error)
        return { success: false, error: 'Gagal membuat kategori' }
    }
}

export async function updateIchicraftCategory(id: string, data: { name: string }) {
    try {
        const existing = await prisma.ichicraftCategory.findFirst({
            where: {
                name: data.name,
                NOT: { id }
            }
        })

        if (existing) {
            return { success: false, error: 'Kategori dengan nama ini sudah ada' }
        }

        const category = await prisma.ichicraftCategory.update({
            where: { id },
            data: { name: data.name }
        })

        revalidatePath(REVALIDATE_PATH)
        return { success: true, data: category }
    } catch (error) {
        console.error('Error updating ichicraft category:', error)
        return { success: false, error: 'Gagal mengupdate kategori' }
    }
}

export async function deleteIchicraftCategory(id: string) {
    try {
        await prisma.ichicraftCategory.delete({
            where: { id }
        })

        revalidatePath(REVALIDATE_PATH)
        return { success: true }
    } catch (error) {
        console.error('Error deleting ichicraft category:', error)
        return { success: false, error: 'Gagal menghapus kategori' }
    }
}

// ============================================================================
// UPLOAD HELPER
// ============================================================================

async function safeUnlink(publicPath: string | null | undefined) {
    if (!publicPath) return
    try {
        // Support both old path format (/uploads/...) and new API path (/api/uploads/...)
        let relativePath = publicPath
        if (relativePath.startsWith('/api/uploads/')) {
            relativePath = relativePath.replace('/api/uploads/', '')
        } else if (relativePath.startsWith('/uploads/')) {
            relativePath = relativePath.replace('/uploads/', '')
        } else {
            return
        }

        // Try uploads/ dir first (production), then public/uploads/ (legacy)
        const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
        const primaryPath = path.join(uploadDir, relativePath)
        const legacyPath = path.join(process.cwd(), 'public', 'uploads', relativePath)

        try { await unlink(primaryPath) } catch { /* ignore */ }
        try { await unlink(legacyPath) } catch { /* ignore */ }
    } catch (e) {
        // ignore error if file not found
    }
}

async function uploadImage(file: File | null): Promise<string | null> {
    if (!file || file.size === 0) return null

    // Use uploads/ dir (outside public/) so it works with standalone + Docker volumes
    const uploadBase = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
    const uploadDir = path.join(uploadBase, 'ichicraft')
    await mkdir(uploadDir, { recursive: true })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Create unique filename
    const ext = path.extname(file.name) || '.jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`
    const filePath = path.join(uploadDir, filename)
    
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('fs').writeFileSync(filePath, buffer)
    
    // Return API route path for serving
    return `/api/uploads/ichicraft/${filename}`
}

// ============================================================================
// PRODUCTS
// ============================================================================

export async function createIchicraftProduct(formData: FormData) {
    try {
        const categoryId = formData.get('categoryId') as string
        const name = formData.get('name') as string
        const keterangan = formData.get('keterangan') as string || null
        const satuan = formData.get('satuan') as string
        const harga = parseFloat(formData.get('harga') as string) || 0
        const imageFile = formData.get('image') as File | null

        const imageUrl = await uploadImage(imageFile)

        const product = await prisma.ichicraftProduct.create({
            data: {
                categoryId,
                name,
                keterangan,
                satuan,
                harga,
                image: imageUrl
            }
        })

        revalidatePath(REVALIDATE_PATH)
        return { success: true, data: product }
    } catch (error) {
        console.error('Error creating ichicraft product:', error)
        return { success: false, error: 'Gagal membuat produk' }
    }
}

export async function updateIchicraftProduct(id: string, formData: FormData) {
    try {
        const name = formData.get('name') as string
        const keterangan = formData.get('keterangan') as string || null
        const satuan = formData.get('satuan') as string
        const harga = parseFloat(formData.get('harga') as string) || 0
        const imageFile = formData.get('image') as File | null
        const removeImage = formData.get('removeImage') === 'true'

        const existingProduct = await prisma.ichicraftProduct.findUnique({
            where: { id }
        })

        if (!existingProduct) {
            return { success: false, error: 'Produk tidak ditemukan' }
        }

        let imageUrl = existingProduct.image

        if (removeImage) {
            await safeUnlink(existingProduct.image)
            imageUrl = null
        } else if (imageFile && imageFile.size > 0) {
            await safeUnlink(existingProduct.image)
            imageUrl = await uploadImage(imageFile)
        }

        const product = await prisma.ichicraftProduct.update({
            where: { id },
            data: {
                name,
                keterangan,
                satuan,
                harga,
                image: imageUrl
            }
        })

        revalidatePath(REVALIDATE_PATH)
        return { success: true, data: product }
    } catch (error) {
        console.error('Error updating ichicraft product:', error)
        return { success: false, error: 'Gagal mengupdate produk' }
    }
}

export async function deleteIchicraftProduct(id: string) {
    try {
        const existingProduct = await prisma.ichicraftProduct.findUnique({
            where: { id }
        })

        if (existingProduct?.image) {
            await safeUnlink(existingProduct.image)
        }

        await prisma.ichicraftProduct.delete({
            where: { id }
        })

        revalidatePath(REVALIDATE_PATH)
        return { success: true }
    } catch (error) {
        console.error('Error deleting ichicraft product:', error)
        return { success: false, error: 'Gagal menghapus produk' }
    }
}
