import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function downloadExternalImage(imageUrl: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl)
        if (!response.ok) return null
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.startsWith('image/')) return null

        const buffer = Buffer.from(await response.arrayBuffer())
        const extension = contentType.split('/')[1] || 'jpg'
        const filename = `imported-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`

        let uploadDir = process.env.UPLOAD_DIR
        if (!uploadDir) {
            if (process.env.NODE_ENV === 'production') {
                uploadDir = path.join(process.cwd(), 'uploads')
            } else {
                uploadDir = path.join(process.cwd(), 'public', 'uploads')
            }
        }

        try { await mkdir(uploadDir, { recursive: true }) } catch (e) { }

        const filePath = path.join(uploadDir, filename)
        await writeFile(filePath, buffer)
        return '/api/uploads/' + filename
    } catch (error) {
        console.error('Error downloading image:', error)
        return null
    }
}
