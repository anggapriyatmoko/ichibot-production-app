import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { Users, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react'
import UserManagementTable from '@/components/hr/user-management-table'
import OvertimeLeaveApproval from '@/components/hr/overtime-leave-approval'
import SalaryComponentList from '@/components/hr/salary-component-list'
import PayrollRecapTable from '@/components/hr/payroll-recap-table'
import AttendanceSummaryTable from '@/components/hr/attendance-summary-table'
import HRDocumentManager from '@/components/hr/hr-document-manager'
import { AnnouncementManager } from '@/components/hr/announcement-manager'
import { getSalaryComponents } from '@/app/actions/salary-settings'
import { getMonthlyPayrollRecap } from '@/app/actions/payroll'
import { getHRDocuments } from '@/app/actions/hr-document'
import ConfidentialAccess from '@/components/auth/confidential-access'

export const metadata = {
    title: 'HRD Dashboard | Ichibot Production',
    description: 'Dashboard HR untuk monitoring karyawan'
}

export const dynamic = 'force-dynamic'

export default async function HRDDashboardPage(props: { searchParams: Promise<{ month?: string, year?: string, attMonth?: string, attYear?: string }> }) {
    const searchParams = await props.searchParams
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        redirect('/login')
    }

    // Only ADMIN, HRD, and ADMINISTRASI can access
    if (!['ADMIN', 'HRD', 'ADMINISTRASI'].includes(session?.user?.role)) {
        redirect('/dashboard')
    }

    // Get Salary Components
    try {
        const [deductionComponents, additionComponents, hrDocs, allUsers] = await Promise.all([
            getSalaryComponents('DEDUCTION'),
            getSalaryComponents('ADDITION'),
            getHRDocuments(),
            prisma.user.findMany({
                select: { id: true, name: true, username: true, role: true },
                orderBy: { name: 'asc' }
            })
        ])

        // Get Payroll Recap Data
        const month = searchParams?.month ? parseInt(searchParams.month) : new Date().getMonth() + 1
        const year = searchParams?.year ? parseInt(searchParams.year) : new Date().getFullYear()

        const attMonth = searchParams?.attMonth ? parseInt(searchParams.attMonth) : new Date().getMonth() + 1
        const attYear = searchParams?.attYear ? parseInt(searchParams.attYear) : new Date().getFullYear()

        const recapData = await getMonthlyPayrollRecap(month, year)

        return (
            <ConfidentialAccess>
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8 text-left">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">HRD Dashboard</h1>
                        <p className="text-muted-foreground">Monitoring dan statistik karyawan.</p>
                    </div>

                    <div className="mb-8">
                        <OvertimeLeaveApproval />
                        <div className="mb-8">
                            <AnnouncementManager allUsers={allUsers} />
                        </div>
                        <HRDocumentManager documents={hrDocs.success ? (hrDocs.data as any[]) : []} />
                    </div>

                    {/* Salary Components Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <SalaryComponentList
                            title="Komponen Pemotongan Gaji"
                            type="DEDUCTION"
                            initialData={deductionComponents.data || []}
                        />
                        <SalaryComponentList
                            title="Komponen Penambahan Gaji"
                            type="ADDITION"
                            initialData={additionComponents.data || []}
                        />
                    </div>

                    {/* Payroll Recap Table */}
                    <PayrollRecapTable
                        data={recapData.success ? (recapData.data as any[]) : []}
                        currentMonth={month}
                        currentYear={year}
                    />

                    {/* Attendance Summary Table */}
                    <AttendanceSummaryTable
                        currentMonth={attMonth}
                        currentYear={attYear}
                    />

                    {/* User Management Table */}
                    <div className="mt-8">
                        <UserManagementTable userRole={session.user.role} />
                    </div>
                </div>
            </ConfidentialAccess>
        )
    } catch (error) {
        console.error('Error loading dashboard data:', error)
        return (
            <div className="p-8 text-center text-red-500">
                Terjadi kesalahan saat memuat data. Silakan coba lagi.
            </div>
        )
    }
}
