'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Loader2, Save } from 'lucide-react'
import { updateWorkSchedule } from '@/app/actions/work-schedule'
import { cn } from '@/lib/utils'

interface WorkSchedule {
    id: string
    dayOfWeek: number
    dayName: string
    startTime: string | null
    endTime: string | null
    isWorkDay: boolean
}

interface Props {
    schedules: WorkSchedule[]
}

export default function WorkScheduleManager({ schedules }: Props) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [localSchedules, setLocalSchedules] = useState(schedules)

    const handleToggleWorkDay = (dayOfWeek: number, isWorkDay: boolean) => {
        setLocalSchedules(prev => prev.map(s =>
            s.dayOfWeek === dayOfWeek
                ? {
                    ...s,
                    isWorkDay,
                    startTime: isWorkDay ? (s.startTime || '08:00') : null,
                    endTime: isWorkDay ? (s.endTime || '17:00') : null
                }
                : s
        ))
    }

    const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
        setLocalSchedules(prev => prev.map(s =>
            s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s
        ))
    }

    const handleSaveAll = async () => {
        setSaving(true)
        try {
            for (const schedule of localSchedules) {
                const formData = new FormData()
                formData.append('dayOfWeek', schedule.dayOfWeek.toString())
                formData.append('isWorkDay', schedule.isWorkDay.toString())
                formData.append('startTime', schedule.startTime || '')
                formData.append('endTime', schedule.endTime || '')

                await updateWorkSchedule(formData)
            }
            router.refresh()
        } catch (error) {
            console.error('Failed to save schedules:', error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Work Schedule Card */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-primary" />
                        <div>
                            <h2 className="font-semibold text-foreground">Jam Kerja</h2>
                            <p className="text-xs text-muted-foreground">Atur jam kerja untuk setiap hari</p>
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {localSchedules.map((schedule) => (
                        <div
                            key={schedule.dayOfWeek}
                            className={cn(
                                "flex items-center justify-between p-4 gap-4",
                                !schedule.isWorkDay && "bg-muted/20"
                            )}
                        >
                            <div className="flex items-center gap-4 min-w-[140px]">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={schedule.isWorkDay}
                                        onChange={(e) => handleToggleWorkDay(schedule.dayOfWeek, e.target.checked)}
                                        className="w-4 h-4 accent-primary"
                                    />
                                    <span className={cn(
                                        "font-medium",
                                        schedule.dayOfWeek === 0 && "text-red-500",
                                        !schedule.isWorkDay && "text-muted-foreground"
                                    )}>
                                        {schedule.dayName}
                                    </span>
                                </label>
                            </div>

                            {schedule.isWorkDay ? (
                                <div className="flex items-center gap-2 flex-1 justify-end">
                                    <input
                                        type="time"
                                        value={schedule.startTime || ''}
                                        onChange={(e) => handleTimeChange(schedule.dayOfWeek, 'startTime', e.target.value)}
                                        className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-28"
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <input
                                        type="time"
                                        value={schedule.endTime || ''}
                                        onChange={(e) => handleTimeChange(schedule.dayOfWeek, 'endTime', e.target.value)}
                                        className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-28"
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 text-right">
                                    <span className="text-sm text-muted-foreground italic">Libur</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Save Button */}
                <div className="p-4 border-t border-border bg-muted/20">
                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Simpan Perubahan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
