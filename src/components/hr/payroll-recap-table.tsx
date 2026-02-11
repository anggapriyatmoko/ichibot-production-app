'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Loader2, FileText, Trash2, Users } from 'lucide-react'
import { deletePayroll } from '@/app/actions/payroll'
import {
    TableWrapper,
    TableScrollArea,
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
    TableHeaderContent,
} from '@/components/ui/table'

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

    const totalBasicSalary = data.reduce((sum, d) => sum + (d.hasPayroll ? d.basicSalary : 0), 0)
    const totalDeductions = data.reduce((sum, d) => sum + (d.hasPayroll ? d.totalDeductions : 0), 0)
    const totalAdditions = data.reduce((sum, d) => sum + (d.hasPayroll ? d.totalAdditions : 0), 0)
    const totalNetSalary = data.reduce((sum, d) => sum + (d.hasPayroll ? d.netSalary : 0), 0)
    const employeesWithPayroll = data.filter(d => d.hasPayroll).length

    return (
        <TableWrapper className="mt-8" loading={isPending}>
            <TableHeaderContent
                title="Rekapitulasi Gaji"
                description={
                    <div className="flex flex-col gap-1">
                        <p>Data penggajian seluruh karyawan.</p>
                        {employeesWithPayroll > 0 && (
                            <p className="text-xs font-bold text-primary">
                                Total Pengeluaran: {formatCurrency(totalNetSalary)}
                            </p>
                        )}
                    </div>
                }
                icon={<FileText className="w-5 h-5 font-bold text-primary" />}
                actions={
                    <div className="flex items-center gap-2">
                        {isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        <select
                            value={currentMonth}
                            onChange={handleMonthChange}
                            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            disabled={isPending}
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                            ))}
                        </select>
                        <select
                            value={currentYear}
                            onChange={handleYearChange}
                            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            disabled={isPending}
                        >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                }
            />

            <TableScrollArea>
                <Table>
                    <TableHeader>
                        <TableRow hoverable={false} className="bg-muted/50">
                            <TableHead>Karyawan</TableHead>
                            <TableHead>Role/Jabatan</TableHead>
                            <TableHead align="right">Gaji Pokok</TableHead>
                            <TableHead align="right" className="text-red-600">Total Potongan</TableHead>
                            <TableHead align="right" className="text-green-600">Total Tambahan</TableHead>
                            <TableHead align="right">Gaji Bersih</TableHead>
                            <TableHead align="center" className="w-32">Slip Gaji</TableHead>
                            <TableHead align="center" className="w-16">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableEmpty
                                colSpan={8}
                                message="Belum ada data karyawan."
                                icon={<Users className="w-12 h-12 opacity-20" />}
                            />
                        ) : (
                            data.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium text-foreground">
                                        {item.name || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold">{item.role}</span>
                                            <span className="text-xs text-muted-foreground">{item.department || '-'}</span>
                                        </div>
                                    </TableCell>

                                    {item.hasPayroll ? (
                                        <>
                                            <TableCell align="right" className="tabular-nums">
                                                {formatCurrency(item.basicSalary)}
                                            </TableCell>
                                            <TableCell align="right" className="tabular-nums text-red-600">
                                                {item.totalDeductions > 0 ? `-${formatCurrency(item.totalDeductions)}` : '-'}
                                            </TableCell>
                                            <TableCell align="right" className="tabular-nums text-green-600">
                                                {item.totalAdditions > 0 ? `+${formatCurrency(item.totalAdditions)}` : '-'}
                                            </TableCell>
                                            <TableCell align="right" className="tabular-nums font-bold text-foreground">
                                                {formatCurrency(item.netSalary)}
                                            </TableCell>
                                            <TableCell align="center">
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
                                            </TableCell>
                                            <TableCell align="center">
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
                                            </TableCell>
                                        </>
                                    ) : (
                                        <td colSpan={6} className="px-4 py-3 text-center text-muted-foreground text-xs italic bg-muted/10">
                                            Belum ada data gaji bulan ini
                                        </td>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    {data.length > 0 && (
                        <TableFooter>
                            <TableRow hoverable={false}>
                                <TableCell colSpan={2} className="font-bold text-foreground">
                                    TOTAL ({employeesWithPayroll} karyawan)
                                </TableCell>
                                <TableCell align="right" className="tabular-nums font-bold text-foreground">
                                    {formatCurrency(totalBasicSalary)}
                                </TableCell>
                                <TableCell align="right" className="tabular-nums font-bold text-red-600">
                                    -{formatCurrency(totalDeductions)}
                                </TableCell>
                                <TableCell align="right" className="tabular-nums font-bold text-green-600">
                                    +{formatCurrency(totalAdditions)}
                                </TableCell>
                                <TableCell align="right" className="tabular-nums font-bold text-primary">
                                    {formatCurrency(totalNetSalary)}
                                </TableCell>
                                <TableCell />
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TableScrollArea>
        </TableWrapper>
    )
}
