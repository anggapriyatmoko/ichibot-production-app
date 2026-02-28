import { requireAuth, isAllowedForPage } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import ServiceRobotManager from '@/components/service-robot/service-robot-manager'

export const metadata = {
    title: 'Service Robot | Ichibot Production',
    description: 'Kelola service dan maintenance robot'
}

export const dynamic = 'force-dynamic'

export default async function ServiceRobotPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    await requireAuth()
    const params = await searchParams
    const session: any = await getServerSession(authOptions)

    // Only allow those configured in RBAC, fallback to ADMIN/TEKNISI
    const isAllowed = await isAllowedForPage('/service-robot')
    if (!isAllowed) {
        redirect('/dashboard')
    }

    const page = typeof params.page === 'string' ? parseInt(params.page) : 1
    const search = typeof params.search === 'string' ? params.search : ''
    const statusFilter = typeof params.status === 'string' ? params.status : ''
    const limit = 20
    const skip = (page - 1) * limit

    // Parse status filter (comma-separated list of statuses)
    const activeStatuses = statusFilter ? statusFilter.split(',') : ['PENDING', 'IN_PROGRESS', 'DONE', 'DELIVERED']

    const where: any = {
        serviceStatus: { in: activeStatuses }
    }

    // Add search filter if present
    if (search) {
        where.OR = [
            { customerName: { contains: search } },
            { customerPhone: { contains: search } },
            { robotType: { contains: search } }
        ]
    }

    const [services, totalCount, recipePromise, customerPromise, statusStats, typeStats, serviceOrdersRaw] = await prisma.$transaction([
        prisma.serviceRobot.findMany({
            where,
            orderBy: { entryDate: 'desc' },
            take: limit,
            skip: skip
        }),
        prisma.serviceRobot.count({ where }),
        prisma.recipe.findMany({
            select: { name: true },
            orderBy: { name: 'asc' }
        }),
        prisma.serviceRobot.findMany({
            select: {
                customerName: true,
                customerAddress: true,
                customerPhone: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            distinct: ['customerName']
        }),
        // Aggregation for Analysis
        prisma.serviceRobot.groupBy({
            by: ['serviceStatus'],
            _count: {
                serviceStatus: true
            },
            orderBy: {
                _count: {
                    serviceStatus: 'desc'
                }
            }
        }),
        prisma.serviceRobot.groupBy({
            by: ['robotType'],
            _count: {
                robotType: true
            },
            orderBy: {
                _count: {
                    robotType: 'desc'
                }
            },
            take: 5
        }),
        // Financial data from service orders
        prisma.serviceOrder.findMany({
            select: {
                createdAt: true,
                items: {
                    select: {
                        productPrice: true,
                        quantity: true
                    }
                }
            }
        })
    ])

    const robotTypes = (await recipePromise).map((r: any) => r.name)
    const customers = (await customerPromise).map((c: any) => ({
        name: c.customerName,
        address: c.customerAddress,
        phone: c.customerPhone
    }))

    const totalPages = Math.ceil(totalCount / limit)

    // Prepare Analysis Data
    const analysisData = {
        totalServices: 0,
        statusCounts: {
            PENDING: 0,
            IN_PROGRESS: 0,
            DONE: 0,
            DELIVERED: 0,
            CANCELLED: 0
        },
        topRobotTypes: (typeStats as any[]).map(t => ({
            name: t.robotType,
            count: t._count.robotType
        }))
    }

        // Populate status counts
        ; (statusStats as any[]).forEach(stat => {
            if (analysisData.statusCounts.hasOwnProperty(stat.serviceStatus)) {
                (analysisData.statusCounts as any)[stat.serviceStatus] = stat._count.serviceStatus
            }
        })

    // Calculate total from global status stats
    analysisData.totalServices = (statusStats as any[]).reduce((acc, curr) => acc + curr._count.serviceStatus, 0)

    // Build financial data
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    const monthlyRevenue: number[] = Array(12).fill(0)
    let totalRevenue = 0
    let totalOrders = 0
    let thisMonthRevenue = 0
    let thisMonthOrders = 0

        ; (serviceOrdersRaw as any[]).forEach(order => {
            const orderTotal = order.items.reduce((acc: number, item: any) => acc + (item.productPrice * item.quantity), 0)
            totalRevenue += orderTotal
            totalOrders++

            const orderDate = new Date(order.createdAt)
            if (orderDate.getFullYear() === currentYear) {
                monthlyRevenue[orderDate.getMonth()] += orderTotal
            }
            if (orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth) {
                thisMonthRevenue += orderTotal
                thisMonthOrders++
            }
        })

    const financialData = {
        totalRevenue,
        totalOrders,
        thisMonthRevenue,
        thisMonthOrders,
        averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        monthlyRevenue
    }

    return (
        <div className="space-y-8">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Service Robot</h1>
                <p className="text-muted-foreground">Kelola service dan maintenance robot.</p>
            </div>

            <ServiceRobotManager
                initialServices={services}
                totalPages={totalPages}
                currentPage={page}
                totalCount={totalCount}
                products={robotTypes}
                customers={customers}
                analysisData={analysisData}
                financialData={financialData}
                isAdmin={await isAllowedForPage('/service-robot')}
            />
        </div>
    )
}
