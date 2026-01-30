'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { revalidatePath } from 'next/cache'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'

// Helper to save file
async function saveFile(file: File, oldPath?: string | null): Promise<string> {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determine upload directory - use environment variable or default
    // In production (Docker), we expect a volume mount at /app/uploads
    let baseUploadDir = process.env.UPLOAD_DIR
    if (!baseUploadDir) {
        baseUploadDir = path.join(process.cwd(), 'uploads')
        // Fallback for local dev if 'uploads' doesn't exist but 'public/uploads' does
        if (!fs.existsSync(baseUploadDir) && fs.existsSync(path.join(process.cwd(), 'public', 'uploads'))) {
            baseUploadDir = path.join(process.cwd(), 'public', 'uploads')
        }
    }

    const uploadDir = path.join(baseUploadDir, 'hr-docs')
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filename = `${uuidv4()}-${file.name.replace(/\s+/g, '-')}`
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, buffer)

    // Return path for API route access
    const relativePath = `/api/uploads/hr-docs/${filename}`

    // Delete old file if exists
    if (oldPath) {
        try {
            // Handle both old public path and new API path
            let oldFilename = oldPath
            if (oldPath.startsWith('/api/uploads/hr-docs/')) {
                oldFilename = oldPath.replace('/api/uploads/hr-docs/', '')
            } else if (oldPath.startsWith('/uploads/hr-docs/')) {
                oldFilename = oldPath.replace('/uploads/hr-docs/', '')
            }
            const oldFilepath = path.join(uploadDir, oldFilename)
            if (fs.existsSync(oldFilepath)) {
                await unlink(oldFilepath)
            }
        } catch (error) {
            console.error('Error deleting old HR doc:', error)
        }
    }

    return relativePath
}

export async function getHRDocuments() {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    // Allow ADMIN, HRD, USER, TEKNISI, and ADMINISTRASI to access
    if (!['ADMIN', 'HRD', 'USER', 'TEKNISI', 'ADMINISTRASI'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    const docs = await prisma.hRDocument.findMany({
        orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: docs }
}

export async function upsertHRDocument(formData: FormData) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    // Only ADMIN, HRD and ADMINISTRASI can modify
    if (!['ADMIN', 'HRD', 'ADMINISTRASI'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    const id = formData.get('id') as string | null
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const link = formData.get('link') as string | null
    const file = formData.get('file') as File | null
    const removeFile = formData.get('removeFile') === 'true'

    if (!name) {
        return { success: false, error: 'Nama dokumen wajib diisi' }
    }

    try {
        let filePath = null
        let existingDoc = null

        if (id) {
            existingDoc = await prisma.hRDocument.findUnique({ where: { id } })
            filePath = existingDoc?.filePath
        }

        if (file && file.size > 0) {
            if (file.size > 1024 * 1024) { // 1MB limit check
                return { success: false, error: 'File terlalu besar (maks 1MB)' }
            }
            filePath = await saveFile(file, filePath)
        } else if (removeFile && filePath) {
            // Delete existing file
            try {
                const oldFilepath = path.join(process.cwd(), 'public', filePath)
                if (fs.existsSync(oldFilepath)) {
                    await unlink(oldFilepath)
                }
            } catch (error) {
                console.error('Error removing file:', error)
            }
            filePath = null
        }

        if (id && existingDoc) {
            await prisma.hRDocument.update({
                where: { id },
                data: {
                    name,
                    description,
                    link,
                    filePath
                }
            })
        } else {
            await prisma.hRDocument.create({
                data: {
                    name,
                    description,
                    link,
                    filePath
                }
            })
        }

        revalidatePath('/hrd-dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error saving HR document:', error)
        return { success: false, error: 'Gagal menyimpan dokumen' }
    }
}

export async function deleteHRDocument(id: string) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    // Only ADMIN, HRD and ADMINISTRASI can access
    if (!['ADMIN', 'HRD', 'ADMINISTRASI'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    try {
        const doc = await prisma.hRDocument.findUnique({ where: { id } })

        if (doc?.filePath) {
            try {
                // Determine upload directory
                let baseUploadDir = process.env.UPLOAD_DIR
                if (!baseUploadDir) {
                    baseUploadDir = path.join(process.cwd(), 'uploads')
                    if (!fs.existsSync(baseUploadDir) && fs.existsSync(path.join(process.cwd(), 'public', 'uploads'))) {
                        baseUploadDir = path.join(process.cwd(), 'public', 'uploads')
                    }
                }
                const hrDocsDir = path.join(baseUploadDir, 'hr-docs')

                // Extract filename from path
                let filename = doc.filePath
                if (doc.filePath.startsWith('/api/uploads/hr-docs/')) {
                    filename = doc.filePath.replace('/api/uploads/hr-docs/', '')
                } else if (doc.filePath.startsWith('/uploads/hr-docs/')) {
                    filename = doc.filePath.replace('/uploads/hr-docs/', '')
                }

                const oldFilepath = path.join(hrDocsDir, filename)
                if (fs.existsSync(oldFilepath)) {
                    await unlink(oldFilepath)
                }
            } catch (error) {
                console.error('Error deleting file:', error)
            }
        }

        await prisma.hRDocument.delete({ where: { id } })

        revalidatePath('/hrd-dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting HR document:', error)
        return { success: false, error: 'Gagal menghapus dokumen' }
    }
}
