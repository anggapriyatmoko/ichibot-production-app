'use client'

import { useState, useEffect } from 'react'
import { getAllMoodsForDate } from '@/app/actions/mood'
import { cn } from '@/lib/utils'
import { CalendarDays, Smile, Loader2, Users, Sun, Moon } from 'lucide-react'

const MOOD_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; gradient: string }> = {
    JOYFUL: { emoji: '🤩', label: 'Joyful', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10', gradient: 'from-yellow-400/20 to-orange-400/20' },
    HAPPY: { emoji: '😃', label: 'Happy', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', gradient: 'from-green-400/20 to-emerald-400/20' },
    RELAXED: { emoji: '😊', label: 'Relaxed', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', gradient: 'from-blue-400/20 to-cyan-400/20' },
    SAD: { emoji: '😞', label: 'Sad', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', gradient: 'from-indigo-400/20 to-purple-400/20' },
    ANGRY: { emoji: '😡', label: 'Angry', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', gradient: 'from-red-400/20 to-rose-400/20' },
}

interface MoodEntry {
    id: string
    userId: string
    date: string
    type: string
    mood: string
    note: string | null
    createdAt: string
    userName: string
    userPhoto: string | null
    userDepartment: string
}

export default function MoodTodayView() {
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
    })
    const [moods, setMoods] = useState<MoodEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchMoods()
    }, [selectedDate])

    const fetchMoods = async () => {
        setLoading(true)
        try {
            const result = await getAllMoodsForDate(selectedDate)
            if (result.success) {
                setMoods(result.data)
            }
        } catch (error) {
            console.error('Error fetching moods:', error)
        } finally {
            setLoading(false)
        }
    }

    // Separate CHECK_IN and CHECK_OUT
    const checkInMoods = moods.filter(m => m.type === 'CHECK_IN')
    const checkOutMoods = moods.filter(m => m.type === 'CHECK_OUT')

    // Calculate stats
    const getStats = (entries: MoodEntry[]) => {
        const counts: Record<string, number> = {}
        entries.forEach(m => {
            counts[m.mood] = (counts[m.mood] || 0) + 1
        })
        return counts
    }

    const checkInStats = getStats(checkInMoods)
    const checkOutStats = getStats(checkOutMoods)
    const totalCheckedIn = checkInMoods.length
    const totalCheckedOut = checkOutMoods.length

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const renderMoodSummary = (stats: Record<string, number>, total: number) => {
        if (total === 0) return null
        const sortedMoods = Object.entries(stats).sort((a, b) => b[1] - a[1])

        return (
            <div className="flex items-center gap-3 flex-wrap">
                {sortedMoods.map(([mood, count]) => {
                    const config = MOOD_CONFIG[mood]
                    if (!config) return null
                    const percentage = Math.round((count / total) * 100)
                    return (
                        <div key={mood} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full", config.bg)}>
                            <span className="text-lg">{config.emoji}</span>
                            <span className={cn("text-sm font-bold", config.color)}>{count}</span>
                            <span className="text-xs text-muted-foreground">({percentage}%)</span>
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderMoodCards = (entries: MoodEntry[]) => {
        if (entries.length === 0) {
            return (
                <div className="text-center py-12 text-muted-foreground">
                    <Smile className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Belum ada data mood</p>
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {entries.map((entry) => {
                    const config = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.RELAXED
                    return (
                        <div
                            key={entry.id}
                            className={cn(
                                "relative overflow-hidden rounded-2xl border border-border bg-card",
                                "hover:shadow-lg hover:border-primary/20 transition-all duration-300",
                                "group"
                            )}
                        >
                            {/* Gradient background accent */}
                            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30", config.gradient)} />

                            <div className="relative p-5">
                                <div className="flex items-start gap-4">
                                    {/* Emoji */}
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0",
                                        config.bg,
                                        "group-hover:scale-110 transition-transform duration-300"
                                    )}>
                                        {config.emoji}
                                    </div>

                                    {/* Info */}
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-semibold text-foreground truncate">{entry.userName}</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">{entry.userDepartment}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={cn("text-sm font-bold", config.color)}>
                                                {config.label}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                • {formatTime(entry.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Note */}
                                {entry.note && (
                                    <div className="mt-3 px-3 py-2 bg-muted/50 rounded-xl">
                                        <p className="text-sm text-muted-foreground italic leading-relaxed">
                                            &ldquo;{entry.note}&rdquo;
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header with date picker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Smile className="w-5 h-5 text-primary" />
                        Mood Karyawan
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {formatDate(selectedDate)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Overall Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Sun className="w-5 h-5 text-amber-500" />
                                <h3 className="font-bold text-foreground">Mood Pagi</h3>
                                <span className="ml-auto text-sm text-muted-foreground flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    {totalCheckedIn}
                                </span>
                            </div>
                            {renderMoodSummary(checkInStats, totalCheckedIn)}
                            {totalCheckedIn === 0 && (
                                <p className="text-sm text-muted-foreground">Belum ada data</p>
                            )}
                        </div>
                        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Moon className="w-5 h-5 text-indigo-500" />
                                <h3 className="font-bold text-foreground">Mood Sore</h3>
                                <span className="ml-auto text-sm text-muted-foreground flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    {totalCheckedOut}
                                </span>
                            </div>
                            {renderMoodSummary(checkOutStats, totalCheckedOut)}
                            {totalCheckedOut === 0 && (
                                <p className="text-sm text-muted-foreground">Belum ada data</p>
                            )}
                        </div>
                    </div>

                    {/* CHECK_IN Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Sun className="w-4 h-4 text-amber-500" />
                            <h3 className="font-semibold text-foreground">Mood Masuk Kerja</h3>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {totalCheckedIn} orang
                            </span>
                        </div>
                        {renderMoodCards(checkInMoods)}
                    </div>

                    {/* CHECK_OUT Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Moon className="w-4 h-4 text-indigo-500" />
                            <h3 className="font-semibold text-foreground">Mood Pulang Kerja</h3>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {totalCheckedOut} orang
                            </span>
                        </div>
                        {renderMoodCards(checkOutMoods)}
                    </div>
                </>
            )}
        </div>
    )
}
