import { requireAuth } from '@/lib/auth'
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

export default async function ServiceRobotPage() {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    // Only allow ADMIN and TEKNISI
    if (!['ADMIN', 'TEKNISI'].includes(session?.user?.role)) {
        redirect('/dashboard')
    }

    // Fetch all services
    const services = await prisma.serviceRobot.findMany({
        orderBy: { entryDate: 'desc' }
    })

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-right md:text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Service Robot</h1>
                <p className="text-muted-foreground">Kelola service dan maintenance robot.</p>
            </div>

            <ServiceRobotManager initialServices={services} />
        </div>
    )
}
