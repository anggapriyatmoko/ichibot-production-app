'use client'

import { useState, useEffect } from 'react'
import { Calendar, Save, CheckCircle } from 'lucide-react'

export default function SalaryCalculationDateCard() {
    const [selectedDay, setSelectedDay] = useState<number>(25)
    const [saving, setSaving] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    useEffect(() => {
        // Load from localStorage
        const saved = localStorage.getItem('salaryCalculationDay')
        if (saved) {
            setSelectedDay(parseInt(saved))
        }
    }, [])

    const handleSave = () => {
        setSaving(true)
        // Simulate save delay
        setTimeout(() => {
            localStorage.setItem('salaryCalculationDay', selectedDay.toString())
            setSaving(false)
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 3000)
        }, 300)
    }

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-muted/30">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Tanggal Perhitungan Gaji
                </h2>
            </div>

            <div className="p-6">
                <p className="text-sm text-muted-foreground mb-4">
                    Pilih tanggal untuk menghitung dan memproses gaji karyawan setiap bulan.
                </p>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-foreground">Tanggal:</label>
                        <select
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                            className="px-3 py-2 bg-background border border-border rounded-lg text-sm font-medium w-20"
                        >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <option key={day} value={day}>{day}</option>
                            ))}
                        </select>
                        <span className="text-sm text-muted-foreground">setiap bulan</span>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>

                {/* Success Popup */}
                {showSuccess && (
                    <div className="mt-4 flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Pengaturan berhasil disimpan!</span>
                    </div>
                )}
            </div>
        </div>
    )
}
