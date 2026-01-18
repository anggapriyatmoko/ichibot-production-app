'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Loader2, FileText, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { deletePayroll } from '@/app/actions/payroll'

export interface PayrollRecapItem {
    id: string
    payrollId?: string
    name: string | null
    role: string
    department: string | null
    hasPayroll: boolean
    basicSalary: number
    totalDeductions: number
    totalAdditions: number
    netSalary: number
    salarySlip: string | null
}

interface Props {
    data: PayrollRecapItem[]
    currentMonth: number
    currentYear: number
}

export default function PayrollRecapTable({ data, currentMonth, currentYear }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const m = e.target.value
        startTransition(() => {
            const params = new URLSearchParams(window.location.search)
            params.set('month', m)
            params.set('year', currentYear.toString())
            router.push(`?${params.toString()}`)
        })
    }

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const y = e.target.value
        startTransition(() => {
            const params = new URLSearchParams(window.location.search)
            params.set('month', currentMonth.toString())
            params.set('year', y)
            router.push(`?${params.toString()}`)
        })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
    }

    const handleDelete = async (payrollId: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data gaji ini? File slip gaji juga akan dihapus.')) return

        startTransition(async () => {
            const result = await deletePayroll(payrollId)
            if (result.success) {
                router.refresh()
            } else {
                alert('Gagal menghapus data gaji')
            }
        })
    }

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mt-8">
            <div className="p-4 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="font-semibold text-foreground">Rekapitulasi Gaji</h2>
                    <p className="text-sm text-muted-foreground">Data penggajian seluruh karyawan</p>
                </div>

                <div className="flex gap-2 items-center">
                    {isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-2" />}
                    <select
                        value={currentMonth}
                        onChange={handleMonthChange}
                        className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
                        disabled={isPending}
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select
                        value={currentYear}
                        onChange={handleYearChange}
                        className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
                        disabled={isPending}
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 font-medium text-muted-foreground">Karyawan</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Role/Jabatan</th>
                            <th className="text-right p-3 font-medium text-muted-foreground">Gaji Pokok</th>
                            <th className="text-right p-3 font-medium text-muted-foreground text-red-600">Total Potongan</th>
                            <th className="text-right p-3 font-medium text-muted-foreground text-green-600">Total Tambahan</th>
                            <th className="text-right p-3 font-medium text-muted-foreground">Gaji Bersih</th>
                            <th className="text-center p-3 font-medium text-muted-foreground w-32">Slip Gaji</th>
                            <th className="text-center p-3 font-medium text-muted-foreground w-16">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                    Belum ada data karyawan.
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr key={item.id} className="hover:bg-muted/30">
                                    <td className="p-3 font-medium text-foreground">{item.name || '-'}</td>
                                    <td className="p-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold">{item.role}</span>
                                            <span className="text-xs text-muted-foreground">{item.department || '-'}</span>
                                        </div>
                                    </td>

                                    {item.hasPayroll ? (
                                        <>
                                            <td className="p-3 text-right tabular-nums">{formatCurrency(item.basicSalary)}</td>
                                            <td className="p-3 text-right tabular-nums text-red-600">
                                                {item.totalDeductions > 0 ? `-${formatCurrency(item.totalDeductions)}` : '-'}
                                            </td>
                                            <td className="p-3 text-right tabular-nums text-green-600">
                                                {item.totalAdditions > 0 ? `+${formatCurrency(item.totalAdditions)}` : '-'}
                                            </td>
                                            <td className="p-3 text-right tabular-nums font-bold text-foreground">
                                                {formatCurrency(item.netSalary)}
                                            </td>
                                            <td className="p-3 text-center">
                                                {item.salarySlip ? (
                                                    <a
                                                        href={item.salarySlip}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        Lihat PDF
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {item.payrollId && (
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => handleDelete(item.payrollId!)}
                                                            className="p-1.5 hover:bg-red-100 text-muted-foreground hover:text-red-600 rounded transition-colors"
                                                            title="Hapus Data Gaji"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </>
                                    ) : (
                                        <td colSpan={6} className="p-3 text-center text-muted-foreground text-xs italic bg-muted/10">
                                            Belum ada data gaji bulan ini
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                    {data.length > 0 && (
                        <tfoot className="bg-muted/80 border-t-2 border-primary/30">
                            <tr>
                                <td colSpan={2} className="p-3 font-bold text-foreground">
                                    TOTAL ({data.filter(d => d.hasPayroll).length} karyawan)
                                </td>
                                <td className="p-3 text-right tabular-nums font-bold text-foreground">
                                    {formatCurrency(data.reduce((sum, d) => sum + (d.hasPayroll ? d.basicSalary : 0), 0))}
                                </td>
                                <td className="p-3 text-right tabular-nums font-bold text-red-600">
                                    -{formatCurrency(data.reduce((sum, d) => sum + (d.hasPayroll ? d.totalDeductions : 0), 0))}
                                </td>
                                <td className="p-3 text-right tabular-nums font-bold text-green-600">
                                    +{formatCurrency(data.reduce((sum, d) => sum + (d.hasPayroll ? d.totalAdditions : 0), 0))}
                                </td>
                                <td className="p-3 text-right tabular-nums font-bold text-primary">
                                    {formatCurrency(data.reduce((sum, d) => sum + (d.hasPayroll ? d.netSalary : 0), 0))}
                                </td>
                                <td className="p-3"></td>
                                <td className="p-3"></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div >
    )
}
