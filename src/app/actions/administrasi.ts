'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'

// Helper to check if user can access administrasi
async function requireAdministrasiAccess() {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    if (!['ADMIN', 'HRD', 'ADMINISTRASI'].includes(session?.user?.role)) {
        throw new Error('Forbidden: Access denied')
    }
    return session
}

const UPLOAD_ROOT = path.join(process.cwd(), 'public/uploads/administrasi')

async function ensureUploadDir(subfolder: string) {
    const dir = path.join(UPLOAD_ROOT, subfolder)
    try {
        await mkdir(dir, { recursive: true })
    } catch (error) {
        // Ignore if exists
    }
    return dir
}

async function saveFile(file: File, subfolder: string): Promise<string> {
    const dir = await ensureUploadDir(subfolder)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const filepath = path.join(dir, filename)
    await writeFile(filepath, buffer)

    return `/uploads/administrasi/${subfolder}/${filename}`
}

async function deleteOldFile(fileUrl: string | null) {
    if (!fileUrl) return
    try {
        const parts = fileUrl.split('/')
        if (parts.length >= 3) {
            const filename = parts.pop()
            const subfolder = parts.pop()
            if (filename && subfolder) {
                const filepath = path.join(UPLOAD_ROOT, subfolder, filename)
                await unlink(filepath).catch(() => { })
            }
        }
    } catch (error) {
        console.error('Failed to delete old file:', error)
    }
}

// Map subfolders to models
const MODEL_MAP: any = {
    'surat-penawaran': prisma.offerLetter,
    'kwitansi': prisma.receipt,
    'surat-balasan': prisma.replyLetter,
    'mou': prisma.mOU,
    'surat-undangan': (prisma as any).invitationLetter
}

const REVALIDATE_PATHS: any = {
    'surat-penawaran': '/administrasi/surat-penawaran',
    'kwitansi': '/administrasi/kwitansi',
    'surat-balasan': '/administrasi/surat-balasan',
    'mou': '/administrasi/mou',
    'surat-undangan': '/administrasi/surat-undangan'
}

export async function createDoc(type: string, formData: FormData) {
    await requireAdministrasiAccess()
    const model = MODEL_MAP[type]
    if (!model) throw new Error('Invalid doc type')

    const date = formData.get('date') as string
    const number = formData.get('number') as string
    const name = formData.get('name') as string
    const institution = formData.get('institution') as string
    const content = formData.get('content') as string
    const link = formData.get('link') as string
    const file = formData.get('file') as File | null

    let filePath = null
    if (file && file.size > 0) {
        filePath = await saveFile(file, type)
    }

    await (model as any).create({
        data: {
            date: new Date(date),
            number,
            name,
            institution,
            content,
            link: link || null,
            filePath
        }
    })

    revalidatePath(REVALIDATE_PATHS[type])
}

export async function updateDoc(type: string, id: string, formData: FormData) {
    await requireAdministrasiAccess()
    const model = MODEL_MAP[type]
    if (!model) throw new Error('Invalid doc type')

    const existing = await (model as any).findUnique({ where: { id } })
    if (!existing) throw new Error('Data not found')

    const date = formData.get('date') as string
    const number = formData.get('number') as string
    const name = formData.get('name') as string
    const institution = formData.get('institution') as string
    const content = formData.get('content') as string
    const link = formData.get('link') as string
    const file = formData.get('file') as File | null
    const removeFile = formData.get('removeFile') === 'true'

    const updateData: any = {
        date: new Date(date),
        number,
        name,
        institution,
        content,
        link: link || null,
    }

    if (removeFile) {
        await deleteOldFile(existing.filePath)
        updateData.filePath = null
    } else if (file && file.size > 0) {
        await deleteOldFile(existing.filePath)
        updateData.filePath = await saveFile(file, type)
    }

    await (model as any).update({
        where: { id },
        data: updateData
    })

    revalidatePath(REVALIDATE_PATHS[type])
}

export async function deleteDoc(type: string, id: string) {
    await requireAdministrasiAccess()
    const model = MODEL_MAP[type]
    if (!model) throw new Error('Invalid doc type')

    const existing = await (model as any).findUnique({ where: { id } })
    if (existing?.filePath) {
        await deleteOldFile(existing.filePath)
    }

    await (model as any).delete({
        where: { id }
    })

    revalidatePath(REVALIDATE_PATHS[type])
}
