import { requireAuth } from '@/lib/auth'
import { getLogActivities, getUsersForLog } from '@/app/actions/log-activity'
import LogActivityManager from '@/components/log-activity/log-activity-manager'

export const metadata = {
    title: 'Log Activity | Ichibot Production',
    description: 'Catat aktivitas harian dan masalah yang ditemukan.',
}


export default async function LogActivityPage() {
    const session: any = await requireAuth()

    // Initial fetch: current user's logs
    const logs = await getLogActivities()

    // If admin, fetch users list for dropdown
    const users = await getUsersForLog()

    return (
        <div className="space-y-8">
            <div className="mb-8 text-left">
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
