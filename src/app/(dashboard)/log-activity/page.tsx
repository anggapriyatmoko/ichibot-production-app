import { requireAuth } from '@/lib/auth'
import { getLogActivities, getUsersForLog } from '@/app/actions/log-activity'
import LogActivityManager from '@/components/log-activity/log-activity-manager'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const metadata = {
    title: 'Log Activity | Ichibot Production',
    description: 'Catat aktivitas harian dan masalah yang ditemukan.',
}

export const dynamic = 'force-dynamic'

export default async function LogActivityPage() {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    // Initial fetch: current user's logs
    const logs = await getLogActivities()

    // If admin, fetch users list for dropdown
    const users = await getUsersForLog()

    return (
        <div className="container mx-auto max-w-5xl">
            <div className="mb-8 text-right md:text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Log Activity</h1>
                <p className="text-muted-foreground">Catat aktivitas harian dan masalah yang ditemukan.</p>
            </div>

            <LogActivityManager
                initialLogs={logs as any}
                users={users}
                currentUser={session.user}
            />
        </div>
    )
}
