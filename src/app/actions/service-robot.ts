'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Helper to check if user can access service robot
async function requireServiceAccess() {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    if (!['ADMIN', 'TEKNISI'].includes(session?.user?.role)) {
        throw new Error('Forbidden: Access denied')
    }
    return session
}

export async function getServiceRobots() {
    await requireServiceAccess()

    return prisma.serviceRobot.findMany({
        orderBy: { entryDate: 'desc' }
    })
}

export async function createServiceRobot(data: {
    entryDate: Date
    customerName: string
    customerAddress: string
    customerPhone: string
    robotType: string
    accessories?: string
    warrantyStatus: string
    complaint: string
    serviceStatus?: string
    serviceNotes?: string
}) {
    const session = await requireServiceAccess()

    const service = await prisma.serviceRobot.create({
        data: {
            entryDate: data.entryDate,
            customerName: data.customerName,
            customerAddress: data.customerAddress,
            customerPhone: data.customerPhone,
            robotType: data.robotType,
            accessories: data.accessories || null,
            warrantyStatus: data.warrantyStatus,
            complaint: data.complaint,
            serviceStatus: data.serviceStatus || 'PENDING',
            serviceNotes: data.serviceNotes || null,
        }
    })

    // Find Recipe for Robot Type
    const recipe = await prisma.recipe.findFirst({
        where: { name: data.robotType }
    })

    // Log Transaction
    await prisma.transaction.create({
        data: {
            type: 'Service Robot',
            quantity: 0,
            recipeId: recipe?.id,
            description: `Service Masuk: ${data.robotType} - ${data.customerName}`,
            userId: session.user.id
        }
    })

    revalidatePath('/service-robot')
    return service
}

export async function updateServiceRobot(id: string, data: {
    entryDate?: Date
    customerName?: string
    customerAddress?: string
    customerPhone?: string
    robotType?: string
    accessories?: string
    warrantyStatus?: string
    complaint?: string
    serviceStatus?: string
    serviceNotes?: string
}) {
    const session = await requireServiceAccess()

    // Fetch existing service to check for changes
    const existingService = await prisma.serviceRobot.findUnique({
        where: { id }
    })

    if (!existingService) {
        throw new Error('Service Robot not found')
    }

    const service = await prisma.serviceRobot.update({
        where: { id },
        data
    })

    // Find Recipe if robotType is updated or exists
    const robotType = data.robotType || service.robotType
    const recipe = await prisma.recipe.findFirst({
        where: { name: robotType }
    })

    let description = `Update Info Service: ${robotType} - ${data.customerName || service.customerName}`

    // Check if status changed
    if (data.serviceStatus && data.serviceStatus !== existingService.serviceStatus) {
        description += ` (Status: ${existingService.serviceStatus} -> ${data.serviceStatus})`
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
