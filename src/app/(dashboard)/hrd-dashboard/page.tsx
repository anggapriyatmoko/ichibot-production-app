import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { isAllowedForPage } from '@/lib/auth'
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
import HRDTabs from '@/components/hr/hrd-tabs'
import { Wallet, FileText } from 'lucide-react'

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

    // Evaluate access using dynamic RBAC, fallback to ADMIN
    const isAllowed = await isAllowedForPage('/hrd-dashboard', ['ADMIN'])
    if (!isAllowed) {
        redirect('/dashboard')
    }

    // Get Salary Components
    try {
        const { decrypt } = require('@/lib/crypto')

        const [deductionComponents, additionComponents, hrDocs, rawUsers] = await Promise.all([
            getSalaryComponents('DEDUCTION'),
            getSalaryComponents('ADDITION'),
            getHRDocuments(),
            (prisma.user as any).findMany({
                select: { id: true, nameEnc: true, usernameEnc: true, roleEnc: true },
                orderBy: { createdAt: 'desc' }
            })
        ])

        // Decrypt user data for UI
        const allUsers = rawUsers.map((u: any) => ({
            id: u.id,
            name: decrypt(u.nameEnc),
            username: decrypt(u.usernameEnc) || 'Unknown',
            role: decrypt(u.roleEnc) || 'USER'
        }))

        // Get Payroll Recap Data
        const month = searchParams?.month ? parseInt(searchParams.month) : new Date().getMonth() + 1
        const year = searchParams?.year ? parseInt(searchParams.year) : new Date().getFullYear()

        const attMonth = searchParams?.attMonth ? parseInt(searchParams.attMonth) : new Date().getMonth() + 1
        const attYear = searchParams?.attYear ? parseInt(searchParams.attYear) : new Date().getFullYear()

        const recapData = await getMonthlyPayrollRecap(month, year)

        const attendanceTabContent = (
            <div className="fade-in">
                <OvertimeLeaveApproval />
            </div>
        )

        const attendanceRecapTabContent = (
            <div className="fade-in">
                <AttendanceSummaryTable
                    currentMonth={attMonth}
                    currentYear={attYear}
                />
            </div>
        )

        const payrollTabContent = (
            <div className="space-y-8 fade-in">
                <PayrollRecapTable
                    data={recapData.success ? (recapData.data as any[]) : []}
                    currentMonth={month}
                    currentYear={year}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
        )

        const documentTabContent = (
            <div className="space-y-8 fade-in">
                <AnnouncementManager allUsers={allUsers} />
                <HRDocumentManager
                    documents={hrDocs.success ? (hrDocs.data as any[]) : []}
                    allUsers={allUsers}
                />
            </div>
        )

        const employeesTabContent = (
            <div className="fade-in">
                <UserManagementTable userRole={session.user.role} />
            </div>
        )

        const tabs = [
            {
                id: 'attendance-recap',
                label: 'Rekap Absensi',
                icon: <Calendar className="w-4 h-4" />,
                content: attendanceRecapTabContent
            },
            {
                id: 'attendance',
                label: 'Izin & Lembur',
                icon: <Clock className="w-4 h-4" />,
                content: attendanceTabContent
            },
            {
                id: 'payroll',
                label: 'Penggajian',
                icon: <Wallet className="w-4 h-4" />,
                content: payrollTabContent
            },
            {
                id: 'documents',
                label: 'Dokumen & Info',
                icon: <FileText className="w-4 h-4" />,
                content: documentTabContent
            },
            {
                id: 'employees',
                label: 'Karyawan',
                icon: <Users className="w-4 h-4" />,
                content: employeesTabContent
            }
        ]

        return (
            <ConfidentialAccess>
                <div className="space-y-8">
                    <div className="mb-8 text-left">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">HRD Dashboard</h1>
                        <p className="text-muted-foreground">Monitoring dan statistik karyawan.</p>
                    </div>

                    <HRDTabs tabs={tabs} defaultTab="attendance-recap" />
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
