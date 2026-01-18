import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { getWorkSchedules } from '@/app/actions/work-schedule'
import WorkScheduleManager from '@/components/hr/work-schedule-manager'

export const metadata = {
    title: 'Setting HR | Ichibot Production',
    description: 'Pengaturan jam kerja'
}

export const dynamic = 'force-dynamic'

export default async function HRSettingsPage() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        redirect('/login')
    }

    // Only ADMIN and HRD can access
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        redirect('/dashboard')
    }

    const schedules = await getWorkSchedules()

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-right md:text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Setting HR</h1>
                <p className="text-muted-foreground">Pengaturan jam kerja dan jadwal karyawan.</p>
            </div>

            <WorkScheduleManager schedules={schedules} />
        </div>
    )
}
