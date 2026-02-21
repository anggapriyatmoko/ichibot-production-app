'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2, FileText, Trash2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
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
    TablePagination,
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
    const [page, setPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [filterRoles, setFilterRoles] = useState<string[]>(['HRD', 'ADMINISTRASI', 'TEKNISI', 'STORE', 'USER'])

    const ROLE_FILTERS = [
        { id: 'ADMIN', label: 'Admin', color: 'red' },
        { id: 'HRD', label: 'HRD', color: 'purple' },
        { id: 'ADMINISTRASI', label: 'Administrasi', color: 'blue' },
        { id: 'TEKNISI', label: 'Teknisi', color: 'cyan' },
        { id: 'STORE', label: 'Store', color: 'orange' },
        { id: 'USER', label: 'User', color: 'gray' },
        { id: 'EXTERNAL', label: 'External', color: 'emerald' },
    ]
    const ALL_ROLE_IDS = ROLE_FILTERS.map(r => r.id)

    const filteredData = data.filter(d => filterRoles.includes(d.role))
    const totalCount = filteredData.length
    const totalPages = Math.ceil(totalCount / itemsPerPage)
    const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage)

    // Calculate global stats for header (all roles, all pages) - ignore filters/pagination
    const globalNetSalary = data.reduce((sum, d) => sum + (d.hasPayroll ? d.netSalary : 0), 0)
    const globalEmployeesCount = data.filter(d => d.hasPayroll).length

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

    const totalBasicSalary = filteredData.reduce((sum, d) => sum + (d.hasPayroll ? d.basicSalary : 0), 0)
    const totalDeductions = filteredData.reduce((sum, d) => sum + (d.hasPayroll ? d.totalDeductions : 0), 0)
    const totalAdditions = filteredData.reduce((sum, d) => sum + (d.hasPayroll ? d.totalAdditions : 0), 0)
    const totalNetSalary = filteredData.reduce((sum, d) => sum + (d.hasPayroll ? d.netSalary : 0), 0)
    const employeesWithPayroll = filteredData.filter(d => d.hasPayroll).length

    return (
        <TableWrapper loading={isPending}>
            <TableHeaderContent
                title="Rekapitulasi Gaji"
                description={
                    <div className="flex flex-col gap-1">
                        <p>Data penggajian seluruh karyawan.</p>
                        {globalEmployeesCount > 0 && (
                            <p className="text-xs font-bold text-primary">
                                Total Pengeluaran: {formatCurrency(globalNetSalary)}
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

            <div className="p-4 border-b border-border bg-muted/10 flex flex-wrap items-center gap-4">
                <span className="text-xs font-bold text-foreground">Filter :</span>
                <div className="flex flex-wrap items-center gap-2">
                    {ROLE_FILTERS.map((f) => {
                        const isSelected = filterRoles.includes(f.id)
                        const colorMap: Record<string, string> = {
                            red: isSelected ? 'bg-red-500/10 border-red-500/30 text-red-600' : '',
                            purple: isSelected ? 'bg-purple-500/10 border-purple-500/30 text-purple-600' : '',
                            blue: isSelected ? 'bg-blue-500/10 border-blue-500/30 text-blue-600' : '',
                            cyan: isSelected ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600' : '',
                            orange: isSelected ? 'bg-orange-500/10 border-orange-500/30 text-orange-600' : '',
                            gray: isSelected ? 'bg-gray-500/10 border-gray-500/30 text-gray-600' : '',
                            emerald: isSelected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : '',
                        }
                        const dotMap: Record<string, string> = {
                            red: isSelected ? 'bg-red-500 ring-red-500/20' : '',
                            purple: isSelected ? 'bg-purple-500 ring-purple-500/20' : '',
                            blue: isSelected ? 'bg-blue-500 ring-blue-500/20' : '',
                            cyan: isSelected ? 'bg-cyan-500 ring-cyan-500/20' : '',
                            orange: isSelected ? 'bg-orange-500 ring-orange-500/20' : '',
                            gray: isSelected ? 'bg-gray-500 ring-gray-500/20' : '',
                            emerald: isSelected ? 'bg-emerald-500 ring-emerald-500/20' : '',
                        }
                        return (
                            <button
                                key={f.id}
                                onClick={() => {
                                    setFilterRoles(prev => isSelected ? prev.filter(r => r !== f.id) : [...prev, f.id])
                                    setPage(1)
                                }}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all',
                                    isSelected ? colorMap[f.color] : 'bg-background border-border text-muted-foreground/50 hover:bg-muted'
                                )}
                            >
                                <div className={cn(
                                    'w-1.5 h-1.5 rounded-full ring-2 ring-offset-1 ring-offset-transparent',
                                    isSelected ? dotMap[f.color] : 'bg-muted-foreground/20 ring-transparent'
                                )} />
                                {f.label}
                            </button>
                        )
                    })}

                    <div className="h-4 w-[1px] bg-border mx-1" />

                    <button
                        onClick={() => {
                            setFilterRoles(prev => prev.length === ALL_ROLE_IDS.length ? [] : [...ALL_ROLE_IDS])
                            setPage(1)
                        }}
                        className="text-[10px] font-bold text-primary hover:underline px-2"
                    >
                        {filterRoles.length === ALL_ROLE_IDS.length ? 'Unselect All' : 'Select All'}
                    </button>
                </div>
            </div>

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
                            paginatedData.map((item) => (
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

            <TablePagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(val) => { setItemsPerPage(val); setPage(1) }}
                totalCount={totalCount}
            />
        </TableWrapper>
    )
}
