'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'

// Helper to check if user can access service robot
async function requireServiceAccess() {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    if (!['ADMIN', 'TEKNISI'].includes(session?.user?.role)) {
        throw new Error('Forbidden: Access denied')
    }
    return session
}

// Helper to save image
async function saveImage(file: File): Promise<string> {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'service-robot')
    await mkdir(uploadDir, { recursive: true })

    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.name) || '.jpg'}`
    const filePath = path.join(uploadDir, uniqueName)
    await writeFile(filePath, buffer)

    return `/uploads/service-robot/${uniqueName}`
}

// Helper to delete old image
async function deleteOldImage(imagePath: string | null) {
    if (!imagePath) return
    try {
        const fullPath = path.join(process.cwd(), 'public', imagePath)
        await unlink(fullPath)
    } catch (error) {
        console.log('Could not delete old image:', error)
    }
}

export async function getServiceRobots() {
    await requireServiceAccess()

    return prisma.serviceRobot.findMany({
        orderBy: { entryDate: 'desc' }
    })
}

export async function createServiceRobot(formData: FormData) {
    const session = await requireServiceAccess()

    // Parse form data
    const entryDateStr = formData.get('entryDate') as string
    const customerName = formData.get('customerName') as string
    const customerAddress = formData.get('customerAddress') as string
    const customerPhone = formData.get('customerPhone') as string
    const robotType = formData.get('robotType') as string
    const accessories = formData.get('accessories') as string
    const warrantyStatus = formData.get('warrantyStatus') as string
    const complaint = formData.get('complaint') as string
    const serviceStatus = formData.get('serviceStatus') as string || 'PENDING'
    const serviceNotes = formData.get('serviceNotes') as string
    const imageFile = formData.get('image') as File | null

    // Parse date
    const [year, month, day] = entryDateStr.split('-').map(Number)
    const now = new Date()
    const entryDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds())

    // Handle image upload
    let imagePath: string | null = null
    if (imageFile && imageFile.size > 0) {
        imagePath = await saveImage(imageFile)
    }

    const service = await prisma.serviceRobot.create({
        data: {
            entryDate,
            customerName,
            customerAddress,
            customerPhone,
            robotType,
            accessories: accessories || null,
            warrantyStatus,
            complaint,
            serviceStatus,
            serviceNotes: serviceNotes || null,
            image: imagePath,
        }
    })

    // Find Recipe for Robot Type
    const recipe = await prisma.recipe.findFirst({
        where: { name: robotType }
    })

    // Log Transaction
    await prisma.transaction.create({
        data: {
            type: 'Service Robot',
            quantity: 0,
            recipeId: recipe?.id,
            description: `Service Masuk: ${robotType} - ${customerName}`,
            userId: session.user.id
        }
    })

    revalidatePath('/service-robot')
    return service
}

export async function updateServiceRobot(id: string, formData: FormData) {
    const session = await requireServiceAccess()

    // Fetch existing service
    const existingService = await prisma.serviceRobot.findUnique({
        where: { id }
    })

    if (!existingService) {
        throw new Error('Service Robot not found')
    }

    // Parse form data
    const entryDateStr = formData.get('entryDate') as string | null
    const customerName = formData.get('customerName') as string | null
    const customerAddress = formData.get('customerAddress') as string | null
    const customerPhone = formData.get('customerPhone') as string | null
    const robotType = formData.get('robotType') as string | null
    const accessories = formData.get('accessories') as string | null
    const warrantyStatus = formData.get('warrantyStatus') as string | null
    const complaint = formData.get('complaint') as string | null
    const serviceStatus = formData.get('serviceStatus') as string | null
    const serviceNotes = formData.get('serviceNotes') as string | null
    const imageFile = formData.get('image') as File | null
    const removeImage = formData.get('removeImage') === 'true'

    // Build update data
    const updateData: any = {}

    if (entryDateStr) {
        const [year, month, day] = entryDateStr.split('-').map(Number)
        const now = new Date()
        updateData.entryDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds())
    }
    if (customerName) updateData.customerName = customerName
    if (customerAddress) updateData.customerAddress = customerAddress
    if (customerPhone) updateData.customerPhone = customerPhone
    if (robotType) updateData.robotType = robotType
    if (accessories !== null) updateData.accessories = accessories || null
    if (warrantyStatus) updateData.warrantyStatus = warrantyStatus
    if (complaint) updateData.complaint = complaint
    if (serviceStatus) updateData.serviceStatus = serviceStatus
    if (serviceNotes !== null) updateData.serviceNotes = serviceNotes || null

    // Handle image
    if (removeImage) {
        await deleteOldImage(existingService.image)
        updateData.image = null
    } else if (imageFile && imageFile.size > 0) {
        await deleteOldImage(existingService.image)
        updateData.image = await saveImage(imageFile)
    }

    const service = await prisma.serviceRobot.update({
        where: { id },
        data: updateData
    })

    // Find Recipe
    const robotTypeName = robotType || service.robotType
    const recipe = await prisma.recipe.findFirst({
        where: { name: robotTypeName }
    })

    let description = `Update Info Service: ${robotTypeName} - ${customerName || service.customerName}`

    // Check if status changed
    if (serviceStatus && serviceStatus !== existingService.serviceStatus) {
        description += ` (Status: ${existingService.serviceStatus} -> ${serviceStatus})`
    }

    // Log Transaction
    await prisma.transaction.create({
        data: {
            type: 'Service Robot',
            quantity: 0,
            recipeId: recipe?.id,
            description,
            userId: session.user.id
        }
    })

    revalidatePath('/service-robot')
    return service
}

export async function deleteServiceRobot(id: string) {
    const session = await requireServiceAccess()

    const service = await prisma.serviceRobot.findUnique({
        where: { id }
    })

    if (service) {
        await prisma.serviceRobot.delete({
            where: { id }
        })

        const recipe = await prisma.recipe.findFirst({
            where: { name: service.robotType }
        })

        // Log Transaction
        await prisma.transaction.create({
            data: {
                type: 'Service Robot',
                quantity: 0,
                recipeId: recipe?.id,
                description: `Hapus Service: ${service.robotType} - ${service.customerName}`,
                userId: session.user.id
            }
        })
    }

    revalidatePath('/service-robot')
}

export async function updateServiceStatus(id: string, status: string) {
    const session = await requireServiceAccess()

    const existingService = await prisma.serviceRobot.findUnique({
        where: { id }
    })

    if (!existingService) {
        throw new Error('Service Robot not found')
    }

    const service = await prisma.serviceRobot.update({
        where: { id },
        data: { serviceStatus: status }
    })

    const recipe = await prisma.recipe.findFirst({
        where: { name: service.robotType }
    })

    // Log Transaction
    await prisma.transaction.create({
        data: {
            type: 'Service Robot',
            quantity: 0,
            recipeId: recipe?.id,
            description: `Update Status Service: ${service.customerName} (${existingService.serviceStatus} -> ${status})`,
            userId: session.user.id
        }
    })

    revalidatePath('/service-robot')
    return service
}

export async function importServiceRobots(data: {
    entryDate: string
    customerName: string
    customerAddress: string
    customerPhone: string
    robotType: string
    accessories?: string
    warrantyStatus: string
    complaint: string
    serviceStatus?: string
    serviceNotes?: string
}[]) {
    const session = await requireServiceAccess()

    // Only ADMIN can import
    if (session.user.role !== 'ADMIN') {
        throw new Error('Forbidden: Only ADMIN can import data')
    }

    let success = 0
    const errors: string[] = []

    for (const item of data) {
        try {
            // Parse date
            let parsedDate: Date
            if (item.entryDate.includes('/')) {
                const parts = item.entryDate.split('/')
                if (parts[2].length === 4) {
                    // DD/MM/YYYY
                    parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
                } else {
                    // MM/DD/YYYY
                    parsedDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]))
                }
            } else if (item.entryDate.includes('-')) {
                parsedDate = new Date(item.entryDate)
            } else {
                // Excel date number
                const excelDate = parseInt(item.entryDate)
                parsedDate = new Date((excelDate - 25569) * 86400 * 1000)
            }

            if (isNaN(parsedDate.getTime())) {
                errors.push(`Row "${item.customerName}": Invalid date format`)
                continue
            }

            // Determine status
            let status = 'PENDING'
            if (item.serviceStatus) {
                const statusMap: { [key: string]: string } = {
                    'pending': 'PENDING',
                    'masuk': 'PENDING',
                    'service masuk': 'PENDING',
                    'dikerjakan': 'IN_PROGRESS',
                    'in_progress': 'IN_PROGRESS',
                    'proses': 'IN_PROGRESS',
                    'selesai': 'DONE',
                    'done': 'DONE',
                    'dikirim': 'DELIVERED',
                    'delivered': 'DELIVERED',
                    'batal': 'CANCELLED',
                    'cancelled': 'CANCELLED'
                }
                const normalizedStatus = item.serviceStatus.toLowerCase().trim()
                status = statusMap[normalizedStatus] || 'PENDING'
            }

            // Determine warranty
            let warranty = 'TIDAK'
            if (item.warrantyStatus) {
                const warrantyLower = item.warrantyStatus.toLowerCase().trim()
                if (warrantyLower === 'ya' || warrantyLower === 'garansi' || warrantyLower === 'yes' || warrantyLower === 'true') {
                    warranty = 'YA'
                }
            }

            await prisma.serviceRobot.create({
                data: {
                    entryDate: parsedDate,
                    customerName: item.customerName,
                    customerAddress: item.customerAddress || '',
                    customerPhone: item.customerPhone || '',
                    robotType: item.robotType,
                    accessories: item.accessories || null,
                    warrantyStatus: warranty,
                    complaint: item.complaint || '',
                    serviceStatus: status,
                    serviceNotes: item.serviceNotes || null,
                }
            })

            success++
        } catch (error: any) {
            errors.push(`Row "${item.customerName}": ${error.message}`)
        }
    }

    // Log transaction for import
    await prisma.transaction.create({
        data: {
            type: 'Service Robot',
            quantity: success,
            description: `Import Service Robot: ${success} data berhasil diimport`,
            userId: session.user.id
        }
    })

    revalidatePath('/service-robot')
    return { success, errors }
}
