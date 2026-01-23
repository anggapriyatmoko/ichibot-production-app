import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { getWorkSchedules, getCustomWorkSchedules } from '@/app/actions/work-schedule'
import WorkScheduleManager from '@/components/hr/work-schedule-manager'
import CustomWorkScheduleManager from '@/components/hr/custom-work-schedule-manager'
import SalaryCalculationDateCard from '@/components/hr/salary-calculation-date-card'

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

    const [schedules, customSchedules] = await Promise.all([
        getWorkSchedules(),
        getCustomWorkSchedules()
    ])

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Setting HR</h1>
                <p className="text-muted-foreground">Pengaturan jam kerja dan jadwal karyawan.</p>
            </div>

            <div className="space-y-6">
                <SalaryCalculationDateCard />
                <WorkScheduleManager schedules={schedules} />
                <CustomWorkScheduleManager schedules={customSchedules} />
            </div>
        </div>
    )
}
