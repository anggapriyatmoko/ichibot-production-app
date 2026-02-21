'use client'

import { useState } from 'react'
import { Lock, Eye, EyeOff, Loader2, User, Phone, MapPin, CreditCard, Calendar, Users, Wallet, FileText, TrendingDown, TrendingUp, Download } from 'lucide-react'
import { verifyUserPassword, getMyProfileData, getMyPayrollData } from '@/app/actions/profile'
import { getHRDocuments } from '@/app/actions/hr-document'
import HRDocumentManager from '@/components/hr/hr-document-manager'
import Image from 'next/image'

interface ProfileData {
    id: string
    name: string | null
    email: string
    department: string | null
    photo: string | null
    phone: string | null
    address: string | null
    ktpNumber: string | null
    contractEndDate: string | null
}

interface PayrollItem {
    id: string
    componentName: string
    componentType: string
    amount: number
}

interface PayrollData {
    id: string
    month: number
    year: number
    basicSalary: number
    netSalary: number
    salarySlip: string | null
    items: PayrollItem[]
}

// Helper to calculate remaining time (same as in UserManagementTable)
function calculateRemainingTime(dateString: string | null) {
    if (!dateString) return null

    const end = new Date(dateString)
    const now = new Date()

    // Reset time for accurate date comparison
    end.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)

    if (end < now) return <span className="text-sm text-red-500 font-medium"> (Sudah Berakhir)</span>

    let months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
    let days = end.getDate() - now.getDate()

    if (days < 0) {
        months--
        // Days in previous month
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0)
        days += prevMonth.getDate()
    }

    if (months < 0) return <span className="text-sm text-red-500 font-medium"> (Sudah Berakhir)</span>

    const parts = []
    if (months > 0) parts.push(`${months} bulan`)
    if (days > 0) parts.push(`${days} hari`)

    if (parts.length === 0) return <span className="text-sm text-orange-500 font-medium"> (Berakhir Hari Ini)</span>

    return <span className="text-sm text-emerald-600 font-medium"> ({parts.join(' ')})</span>
}

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

export default function HROtherDataPage() {
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role
    const [profileData, setProfileData] = useState<ProfileData | null>(null)
    const [payrollData, setPayrollData] = useState<PayrollData | null>(null)
    const [loadingProfile, setLoadingProfile] = useState(false)
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [hrDocs, setHrDocs] = useState<any[]>([])

    useEffect(() => {
        if (userRole && userRole !== 'EXTERNAL') {
            loadProfileData()
        }
    }, [userRole])

    const loadProfileData = async () => {
        setLoadingProfile(true)
        try {
            const [profileResult, payrollResult, hrDocsResult] = await Promise.all([
                getMyProfileData(),
                getMyPayrollData(selectedMonth, selectedYear),
                getHRDocuments()
            ])
            setProfileData(profileResult as ProfileData | null)
            setPayrollData(payrollResult as PayrollData | null)
            if (hrDocsResult.success) {
                setHrDocs(hrDocsResult.data as any[])
            }
        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setLoadingProfile(false)
        }
    }

    const loadPayrollData = async (month: number, year: number) => {
        try {
            const result = await getMyPayrollData(month, year)
            setPayrollData(result as PayrollData | null)
        } catch (err) {
            console.error('Failed to load payroll:', err)
        }
    }

    const handleMonthChange = async (month: number, year: number) => {
        setSelectedMonth(month)
        setSelectedYear(year)
        await loadPayrollData(month, year)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
    }

    const getMonthName = (month: number) => {
        return new Date(2000, month - 1).toLocaleString('id-ID', { month: 'long' })
    }

    if (userRole === 'EXTERNAL') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
                <Lock className="w-12 h-12 text-muted-foreground mb-4" />
                <h1 className="text-xl font-bold">Akses Dibatasi</h1>
                <p className="text-muted-foreground mt-2">Maaf, akun Anda tidak memiliki izin untuk mengakses halaman ini.</p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Data Lainnya</h1>
                <p className="text-muted-foreground">Info data diri karyawan.</p>
            </div>

            {loadingProfile ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-4">Memuat data...</p>
                </div>
            ) : (
                <>
                    {/* Profile Card */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-border bg-muted/30">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                DATA DIRI KARYAWAN
                            </h2>
                        </div>

                        <div className="p-6">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center mb-8">
                                <div className="w-24 h-24 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center mb-3 shadow-sm">
                                    {profileData?.photo ? (
                                        <Image
                                            src={profileData.photo}
                                            alt={profileData.name || 'Profile'}
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Users className="w-10 h-10 text-muted-foreground" />
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-foreground">{profileData?.name || 'Nama Tidak Tersedia'}</h3>
                                <p className="text-muted-foreground">{profileData?.department || 'Departemen Tidak Tersedia'}</p>
                            </div>

                            {/* Data Grid */}
                            <div className="grid grid-cols-1 gap-6">

                                {/* Contact Info */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">Kontak & Identitas</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                                            <User className="w-5 h-5 text-blue-500 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Email</p>
                                                <p className="font-medium text-foreground break-all">{profileData?.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                                            <Phone className="w-5 h-5 text-green-500 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">No Handphone</p>
                                                <p className="font-medium text-foreground">{profileData?.phone || '-'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                                            <CreditCard className="w-5 h-5 text-purple-500 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">No KTP</p>
                                                <p className="font-medium text-foreground">{profileData?.ktpNumber || '-'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                                            <Calendar className="w-5 h-5 text-orange-500 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Masa Kontrak Berakhir</p>
                                                <p className="font-medium text-foreground">
                                                    {profileData?.contractEndDate ? new Date(profileData.contractEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                                    {calculateRemainingTime(profileData?.contractEndDate || null)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">Lokasi</h4>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                                        <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                                        <div className="w-full">
                                            <p className="text-xs text-muted-foreground">Alamat Lengkap</p>
                                            <p className="font-medium text-foreground">{profileData?.address || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        <div className="p-4 border-t border-border bg-muted/20">
                            <p className="text-xs text-muted-foreground text-center">
                                Data ini hanya dapat dilihat dan tidak dapat diubah sendiri. Hubungi HRD untuk perubahan data.
                            </p>
                        </div>
                    </div>

                    {/* HR Documents Section */}
                    <div className="mt-6">
                        <HRDocumentManager documents={hrDocs} readOnly={true} />
                    </div>

                    {/* Salary Card - Separate */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        {/* Salary Section */}
                        <div className="p-4 border-b border-border bg-muted/30">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-primary" />
                                DATA GAJI
                            </h2>
                        </div>

                        <div className="p-6">
                            {/* Month/Year Selector */}
                            <div className="flex gap-3 mb-6">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => handleMonthChange(parseInt(e.target.value), selectedYear)}
                                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{getMonthName(m)}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => handleMonthChange(selectedMonth, parseInt(e.target.value))}
                                    className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            {payrollData ? (
                                <div className="space-y-6">
                                    {/* Basic Salary */}
                                    <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-200">
                                        <Wallet className="w-6 h-6 text-blue-600" />
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">Gaji Pokok</p>
                                            <p className="text-xl font-bold text-foreground">{formatCurrency(payrollData.basicSalary)}</p>
                                        </div>
                                    </div>

                                    {/* Deductions & Additions Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Deductions */}
                                        <div className="p-4 rounded-lg border border-red-200 bg-red-500/5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <TrendingDown className="w-4 h-4 text-red-500" />
                                                <h5 className="font-semibold text-red-600 text-sm">Potongan</h5>
                                            </div>
                                            <div className="space-y-2">
                                                {payrollData.items
                                                    .filter(item => item.componentType === 'DEDUCTION')
                                                    .map(item => (
                                                        <div key={item.id} className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">{item.componentName}</span>
                                                            <span className="font-medium text-red-600">-{formatCurrency(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                {payrollData.items.filter(item => item.componentType === 'DEDUCTION').length === 0 && (
                                                    <p className="text-xs text-muted-foreground italic">Tidak ada potongan</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Additions */}
                                        <div className="p-4 rounded-lg border border-green-200 bg-green-500/5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <TrendingUp className="w-4 h-4 text-green-500" />
                                                <h5 className="font-semibold text-green-600 text-sm">Tambahan</h5>
                                            </div>
                                            <div className="space-y-2">
                                                {payrollData.items
                                                    .filter(item => item.componentType === 'ADDITION')
                                                    .map(item => (
                                                        <div key={item.id} className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">{item.componentName}</span>
                                                            <span className="font-medium text-green-600">+{formatCurrency(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                {payrollData.items.filter(item => item.componentType === 'ADDITION').length === 0 && (
                                                    <p className="text-xs text-muted-foreground italic">Tidak ada tambahan</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Net Salary */}
                                    <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/30">
                                        <Wallet className="w-6 h-6 text-primary" />
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">Total Gaji Bersih</p>
                                            <p className="text-2xl font-bold text-primary">{formatCurrency(payrollData.netSalary)}</p>
                                        </div>
                                    </div>

                                    {/* Salary Slip */}
                                    {payrollData.salarySlip && (
                                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/20 border border-border">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-foreground">Slip Gaji</p>
                                                <p className="text-xs text-muted-foreground">Slip gaji bulan {getMonthName(payrollData.month)} {payrollData.year}</p>
                                            </div>
                                            <a
                                                href={payrollData.salarySlip}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <Download className="w-4 h-4" />
                                                Unduh
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-muted-foreground">Belum ada data gaji untuk {getMonthName(selectedMonth)} {selectedYear}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
