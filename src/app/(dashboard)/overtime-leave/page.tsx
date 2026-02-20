import OvertimeLeaveManager from '@/components/hr/overtime-leave-manager'

export default function OvertimeLeavePage() {
    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Izin / Lembur</h1>
                <p className="text-muted-foreground">Kelola data izin dan lembur karyawan.</p>
            </div>

            <OvertimeLeaveManager userRole={''} />
        </div>
    )
}
