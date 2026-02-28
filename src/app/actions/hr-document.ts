'use server'

import prisma from '@/lib/prisma'
import { requireAuth, requirePageAccess } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { revalidatePath } from 'next/cache'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import { encrypt, decrypt } from '@/lib/crypto'

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
    try {
        await requireAuth()

        const session = await getServerSession(authOptions)
        const user = (session as any)?.user
        const isAdminOrHRD = ['ADMIN', 'HRD'].includes(user?.role)

        const docs = await (prisma.hRDocument as any).findMany({
            where: isAdminOrHRD ? {} : {
                OR: [
                    { isForAll: true },
                    { targetUsers: { some: { id: user?.id || '' } } }
                ]
            },
            include: {
                targetUsers: {
                    select: { id: true, nameEnc: true, usernameEnc: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return {
            success: true,
            data: docs.map((doc: any) => ({
                id: doc.id,
                name: decrypt(doc.nameEnc) || '',
                description: decrypt(doc.descriptionEnc) || '',
                link: decrypt(doc.linkEnc) || '',
                filePath: decrypt(doc.filePathEnc) || '',
                isForAll: doc.isForAll ?? true,
                targetUsers: (doc.targetUsers || []).map((u: any) => ({
                    id: u.id,
                    name: decrypt(u.nameEnc) || '',
                    username: decrypt(u.usernameEnc) || 'Unknown'
                })),
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
            }))
        }
    } catch (error) {
        console.error('Error in getHRDocuments:', error)
        return { success: false, error: 'Gagal memuat dokumen' }
    }
}

export async function upsertHRDocument(formData: FormData) {
    await requireAuth()
    await requirePageAccess('/hrd-dashboard')

    const id = formData.get('id') as string | null
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const link = formData.get('link') as string | null
    const file = formData.get('file') as File | null
    const removeFile = formData.get('removeFile') === 'true'
    const isForAll = formData.get('isForAll') === 'true'
    const targetUserIdsStr = formData.get('targetUserIds') as string | null
    const targetUserIds = targetUserIdsStr ? JSON.parse(targetUserIdsStr) : []

    if (!name) {
        return { success: false, error: 'Nama dokumen wajib diisi' }
    }

    try {
        let filePath = null
        let existingDoc = null

        if (id) {
            existingDoc = await prisma.hRDocument.findUnique({ where: { id } })
            filePath = existingDoc?.filePathEnc ? decrypt(existingDoc.filePathEnc) : null
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

        const data: any = {
            nameEnc: encrypt(name) || '',
            descriptionEnc: encrypt(description || ''),
            linkEnc: encrypt(link || ''),
            filePathEnc: encrypt(filePath || ''),
            isForAll: isForAll,
            targetUsers: {
                [id ? 'set' : 'connect']: targetUserIds.map((userId: string) => ({ id: userId }))
            }
        }

        if (id && existingDoc) {
            await (prisma.hRDocument as any).update({
                where: { id },
                data
            })
        } else {
            await (prisma.hRDocument as any).create({
                data
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
    await requirePageAccess('/hrd-dashboard')

    try {
        const doc = await prisma.hRDocument.findUnique({ where: { id } })

        if (doc?.filePathEnc) {
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
                let filename = doc.filePathEnc ? (decrypt(doc.filePathEnc) || '') : ''
                if (filename) {
                    if (filename.startsWith('/api/uploads/hr-docs/')) {
                        filename = filename.replace('/api/uploads/hr-docs/', '')
                    } else if (filename.startsWith('/uploads/hr-docs/')) {
                        filename = filename.replace('/uploads/hr-docs/', '')
                    }

                    const oldFilepath = path.join(hrDocsDir, filename)
                    if (fs.existsSync(oldFilepath)) {
                        await unlink(oldFilepath)
                    }
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
