import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import mime from 'mime'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    const filename = (await params).filename

    // Determine upload directory
    // In production (Docker), we expect a volume mount at /app/uploads
    // locally we might fallback to public/uploads or just uploads
    let uploadDir = process.env.UPLOAD_DIR
    if (!uploadDir) {
        uploadDir = path.join(process.cwd(), 'uploads')
        // Fallback for local dev if 'uploads' doesn't exist but 'public/uploads' does
        if (!fs.existsSync(uploadDir) && fs.existsSync(path.join(process.cwd(), 'public', 'uploads'))) {
            uploadDir = path.join(process.cwd(), 'public', 'uploads')
        }
    }

    const filePath = path.join(uploadDir, filename)

    // Security check: Prevent directory traversal
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(path.resolve(uploadDir))) {
        return new NextResponse('Invalid file path', { status: 400 })
    }

    if (!fs.existsSync(filePath)) {
        return new NextResponse('File not found', { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    const contentType = mime.getType(filePath) || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    })
}
