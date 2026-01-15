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
