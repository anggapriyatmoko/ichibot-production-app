import { redirect } from 'next/navigation'
import { getWorkSchedules, getCustomWorkSchedules } from '@/app/actions/work-schedule'
import { getSystemSetting } from '@/app/actions/settings'
import WorkScheduleManager from '@/components/hr/work-schedule-manager'
import CustomWorkScheduleManager from '@/components/hr/custom-work-schedule-manager'
import SalaryCalculationDateCard from '@/components/hr/salary-calculation-date-card'
import AnnouncementSettings from '@/components/hr/announcement-settings'
import { requireAuth, isAllowedForPage } from '@/lib/auth'

export const metadata = {
    title: 'Setting HR | Ichibot Production',
    description: 'Pengaturan jam kerja'
}

export const dynamic = 'force-dynamic'

export default async function HRSettingsPage() {
    await requireAuth()
    const allowed = await isAllowedForPage('/hr-settings')
    if (!allowed) redirect('/dashboard')


    const [schedules, customSchedules, announcementSpeed] = await Promise.all([
        getWorkSchedules(),
        getCustomWorkSchedules(),
        getSystemSetting('ANNOUNCEMENT_SPEED')
    ])

    return (
        <div className="space-y-8">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Setting HR</h1>
                <p className="text-muted-foreground">Pengaturan jam kerja dan jadwal karyawan.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SalaryCalculationDateCard />
                <AnnouncementSettings initialSpeed={parseInt(announcementSpeed || '12')} />
                <WorkScheduleManager schedules={schedules} />
                <CustomWorkScheduleManager schedules={customSchedules} />
            </div>
        </div>
    )
}
