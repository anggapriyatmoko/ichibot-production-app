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
    await requireServiceAccess()

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
    await requireServiceAccess()

    const service = await prisma.serviceRobot.update({
        where: { id },
        data
    })

    revalidatePath('/service-robot')
    return service
}

export async function deleteServiceRobot(id: string) {
    await requireServiceAccess()

    await prisma.serviceRobot.delete({
        where: { id }
    })

    revalidatePath('/service-robot')
}

export async function updateServiceStatus(id: string, status: string) {
    await requireServiceAccess()

    const service = await prisma.serviceRobot.update({
        where: { id },
        data: { serviceStatus: status }
    })

    revalidatePath('/service-robot')
    return service
}
