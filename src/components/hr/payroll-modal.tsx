'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Save, Loader2, Upload, FileText, Trash2 } from 'lucide-react'
import { upsertPayroll, getPayroll } from '@/app/actions/payroll'
import { getSalaryComponents } from '@/app/actions/salary-settings'
import { useAlert } from '@/hooks/use-alert'

interface User {
    id: string
    name: string | null
}

interface Component {
    id: string
    name: string
    type: string
}

interface Props {
    user: User
    onClose: () => void
}

export default function PayrollModal({ user, onClose }: Props) {
    const { showAlert, showError } = useAlert()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [year, setYear] = useState(new Date().getFullYear())
    const router = useRouter()

    // Data
    const [deductions, setDeductions] = useState<Component[]>([])
    const [additions, setAdditions] = useState<Component[]>([])
    const [payrollId, setPayrollId] = useState<string | null>(null)

    // Form State
    const [basicSalary, setBasicSalary] = useState<string>('0')
    const [itemValues, setItemValues] = useState<Record<string, string>>({})
    const [salarySlipFile, setSalarySlipFile] = useState<File | null>(null)
    const [existingSlip, setExistingSlip] = useState<string | null>(null)
    const [removeExistingSlip, setRemoveExistingSlip] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Helper to format number string with dots
    const formatNumber = (val: string) => {
        if (!val) return ''
        return val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }

    // Helper to parse string with dots to number
    const parseNumber = (val: string) => {
        if (!val) return 0
        return parseFloat(val.replace(/\./g, '').replace(/,/g, '.') || '0')
    }

    const handleBasicSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        // Remove non-digits
        const numericVal = val.replace(/\D/g, '')
        setBasicSalary(formatNumber(numericVal))
    }

    const handleItemChange = (id: string, val: string) => {
        const numericVal = val.replace(/\D/g, '')
        setItemValues({ ...itemValues, [id]: formatNumber(numericVal) })
    }

    // Calculate Net Salary for Display
    const calculateNet = () => {
        let net = parseNumber(basicSalary)

        deductions.forEach(d => {
            const val = parseNumber(itemValues[d.id])
            net -= val
        })

        additions.forEach(a => {
            const val = parseNumber(itemValues[a.id])
            net += val
        })

        return net
    }

    useEffect(() => {
        // Load configurations and existing payroll data
        const init = async () => {
            setLoading(true)
            try {
                // Fetch Components
                const [dRes, aRes] = await Promise.all([
                    getSalaryComponents('DEDUCTION'),
                    getSalaryComponents('ADDITION')
                ])

                if (dRes.success) setDeductions(dRes.data as Component[])
                if (aRes.success) setAdditions(aRes.data as Component[])

                await loadPayrollData(month, year)
            } catch (error) {
                console.error(error)
                showError('Gagal memuat data awal')
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [])

    const loadPayrollData = async (m: number, y: number) => {
        setLoading(true)
        try {
            const res = await getPayroll(user.id, m, y)
            if (res.success && res.data) {
                const p = res.data
                setPayrollId(p.id)
                setBasicSalary(formatNumber(p.basicSalary.toString()))
                setExistingSlip(p.salarySlip)

                const values: Record<string, string> = {}
                p.items.forEach((item: any) => {
                    values[item.componentId] = formatNumber(item.amount.toString())
                })
                setItemValues(values)
            } else {
                // Reset form if no data
                setPayrollId(null)
                setBasicSalary('0')
                setExistingSlip(null)
                setItemValues({})
            }
        } finally {
            setLoading(false)
        }
    }

    // Reload when date changes
    const handleDateChange = async (m: number, y: number) => {
        setMonth(m)
        setYear(y)
        await loadPayrollData(m, y)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.type !== 'application/pdf') {
            showError('Hanya file PDF yang diperbolehkan')
            return
        }

        if (file.size > 1024 * 1024) { // 1MB
            showError('Ukuran file maksimal 1MB')
            return
        }

        setSalarySlipFile(file)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const fd = new FormData()
            fd.append('userId', user.id)
            fd.append('month', month.toString())
            fd.append('year', year.toString())
            fd.append('basicSalary', parseNumber(basicSalary).toString())

            // Collect items
            const items = []
            for (const [id, val] of Object.entries(itemValues)) {
                const numVal = parseNumber(val)
                if (numVal > 0) {
                    items.push({
                        componentId: id,
                        amount: numVal
                    })
                }
            }
            fd.append('items', JSON.stringify(items))

            if (salarySlipFile) {
                fd.append('salarySlip', salarySlipFile)
            }

            // Handle removal of existing slip
            if (removeExistingSlip && !salarySlipFile) {
                fd.append('removeSalarySlip', 'true')
            }

            const res = await upsertPayroll(fd)

            if (res.success) {
                showAlert('Data gaji berhasil disimpan')
                router.refresh()
                onClose()
            } else {
                showError(res.error || 'Gagal menyimpan data')
            }
        } catch (error) {
            console.error(error)
            showError('Terjadi kesalahan')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center py-20 md:py-8 px-4 overflow-y-auto bg-black/60 backdrop-blur-sm">
            <div className="bg-card order border-border rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Input Data Gaji</h3>
                        <p className="text-sm text-muted-foreground">{user.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSave} className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Month Year Selection */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Bulan</label>
                            <select
                                value={month}
                                onChange={(e) => handleDateChange(parseInt(e.target.value), year)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Tahun</label>
                            <select
                                value={year}
                                onChange={(e) => handleDateChange(month, parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {/* Basic Salary */}
                            <div>
                                <label className="block text-xs font-medium text-foreground mb-1">Gaji Pokok</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-muted-foreground text-sm">Rp</span>
                                    <input
                                        type="text"
                                        value={basicSalary}
                                        onChange={handleBasicSalaryChange}
                                        className="w-full pl-10 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Deductions */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-red-600 border-b border-red-200 pb-1">Pemotongan</h4>
                                    {deductions.map(comp => (
                                        <div key={comp.id}>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">{comp.name}</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-muted-foreground text-sm">Rp</span>
                                                <input
                                                    type="text"
                                                    value={itemValues[comp.id] || ''}
                                                    onChange={(e) => handleItemChange(comp.id, e.target.value)}
                                                    className="w-full pl-10 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {deductions.length === 0 && <p className="text-xs text-muted-foreground italic">Tidak ada komponen pemotongan</p>}
                                </div>

                                {/* Additions */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-green-600 border-b border-green-200 pb-1">Penambahan</h4>
                                    {additions.map(comp => (
                                        <div key={comp.id}>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">{comp.name}</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-muted-foreground text-sm">Rp</span>
                                                <input
                                                    type="text"
                                                    value={itemValues[comp.id] || ''}
                                                    onChange={(e) => handleItemChange(comp.id, e.target.value)}
                                                    className="w-full pl-10 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {additions.length === 0 && <p className="text-xs text-muted-foreground italic">Tidak ada komponen penambahan</p>}
                                </div>
                            </div>


                            {/* Summary */}
                            <div className="bg-muted/30 p-4 rounded-lg flex justify-between items-center border border-border">
                                <span className="font-semibold text-foreground">Total Gaji Bersih</span>
                                <span className="font-bold text-xl text-primary">
                                    Rp {calculateNet().toLocaleString('id-ID')}
                                </span>
                            </div>

                            {/* File Upload */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-foreground">Upload Slip Gaji (PDF)</label>
                                <div className="border-2 border-dashed border-border rounded-lg p-6 hover:bg-muted/50 transition-colors text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-foreground font-medium">Klik untuk upload file</p>
                                    <p className="text-xs text-muted-foreground">Maksimal 1MB, Format PDF</p>
                                </div>

                                {(salarySlipFile || (existingSlip && !removeExistingSlip)) && (
                                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-200 rounded-lg">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {salarySlipFile ? salarySlipFile.name : 'Slip Gaji Tersimpan.pdf'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {salarySlipFile ? `${(salarySlipFile.size / 1024).toFixed(0)} KB` : 'File tersimpan'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (salarySlipFile) {
                                                    setSalarySlipFile(null)
                                                } else {
                                                    setRemoveExistingSlip(true)
                                                }
                                            }}
                                            className="p-1.5 hover:bg-red-500/20 bg-red-500/10 text-red-500 rounded-lg transition-colors"
                                            title="Hapus slip gaji"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </form>

                {/* Footer */}
                <div className="p-4 border-t border-border flex justify-end gap-2 bg-card">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Simpan Data
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
