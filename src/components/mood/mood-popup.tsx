'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { submitMood, getUserMoodToday } from '@/app/actions/mood'
import { cn } from '@/lib/utils'
import { X, Send, Loader2 } from 'lucide-react'

const MOODS = [
    { value: 'JOYFUL', emoji: '🤩', label: 'Joyful', color: 'from-yellow-400 to-orange-400', bg: 'bg-yellow-500/10', ring: 'ring-yellow-400' },
    { value: 'HAPPY', emoji: '😃', label: 'Happy', color: 'from-green-400 to-emerald-400', bg: 'bg-green-500/10', ring: 'ring-green-400' },
    { value: 'RELAXED', emoji: '😊', label: 'Relaxed', color: 'from-blue-400 to-cyan-400', bg: 'bg-blue-500/10', ring: 'ring-blue-400' },
    { value: 'SAD', emoji: '😞', label: 'Sad', color: 'from-indigo-400 to-purple-400', bg: 'bg-indigo-500/10', ring: 'ring-indigo-400' },
    { value: 'ANGRY', emoji: '😡', label: 'Angry', color: 'from-red-400 to-rose-400', bg: 'bg-red-500/10', ring: 'ring-red-400' },
]

type MoodType = 'CHECK_IN' | 'CHECK_OUT'

export default function MoodPopup() {
    const searchParams = useSearchParams()
    const [isOpen, setIsOpen] = useState(false)
    const [moodType, setMoodType] = useState<MoodType>('CHECK_IN')
    const [selectedMood, setSelectedMood] = useState<string | null>(null)
    const [note, setNote] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Test mode: ?test-mood=check_in or ?test-mood=check_out
    const testMood = searchParams.get('test-mood')

    const checkScheduleAndMood = useCallback(async () => {
        try {
            if (checkTimeoutRef.current) {
                clearTimeout(checkTimeoutRef.current)
                checkTimeoutRef.current = null
            }

            // TEST MODE: bypass time checks
            if (testMood) {
                const type = testMood.toUpperCase() === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN'
                setMoodType(type)
                setIsOpen(true)
                return
            }

            // Fetch today's work schedule
            const res = await fetch('/api/mood/work-schedule')
            if (!res.ok) return
            const schedule = await res.json()

            // If not a work day, don't show popup
            if (!schedule.isWorkDay || !schedule.startTime || !schedule.endTime) return

            const now = new Date()
            const currentHour = now.getHours()
            const currentMinute = now.getMinutes()
            const currentTotal = currentHour * 60 + currentMinute

            // Parse schedule times
            const [startH, startM] = schedule.startTime.split(':').map(Number)
            const [endH, endM] = schedule.endTime.split(':').map(Number)
            const startTotal = startH * 60 + startM
            const endTotal = endH * 60 + endM

            const checkInLimit = startTotal + (4 * 60) // 4 hours after start time
            const checkOutStart = endTotal - (1 * 60) // 2 hours before end time
            const checkOutEnd = endTotal + (3 * 60) // 4 hours after end time

            // Determine which mood type to show
            // CHECK_IN: from start time until 4 hours after
            // CHECK_OUT: from 2 hours before end time until 2 hours after
            let typeToShow: MoodType | null = null

            if (currentTotal >= startTotal && currentTotal <= checkInLimit) {
                typeToShow = 'CHECK_IN'
            } else if (currentTotal >= checkOutStart && currentTotal <= checkOutEnd) {
                typeToShow = 'CHECK_OUT'
            }

            if (!typeToShow) return

            // Check if snoozed
            if (typeof window !== 'undefined') {
                const snoozedUntilStr = localStorage.getItem('mood_snoozed_until')
                if (snoozedUntilStr) {
                    const snoozedUntil = parseInt(snoozedUntilStr, 10)
                    const currentTime = Date.now()
                    if (currentTime < snoozedUntil) {
                        const remaining = snoozedUntil - currentTime
                        checkTimeoutRef.current = setTimeout(checkScheduleAndMood, remaining)
                        return
                    } else {
                        localStorage.removeItem('mood_snoozed_until')
                    }
                }
            }

            // Check if already submitted
            const existing = await getUserMoodToday(typeToShow)
            if (existing) return

            setMoodType(typeToShow)
            setIsOpen(true)
        } catch (error) {
            console.error('Error checking mood schedule:', error)
        }
    }, [testMood])

    useEffect(() => {
        // Check immediately on mount
        checkScheduleAndMood()

        // Re-check every 5 minutes (only in non-test mode)
        if (!testMood) {
            const interval = setInterval(checkScheduleAndMood, 5 * 60 * 1000)
            return () => {
                clearInterval(interval)
                if (checkTimeoutRef.current) {
                    clearTimeout(checkTimeoutRef.current)
                }
            }
        }
    }, [checkScheduleAndMood, testMood])

    const handleClose = () => {
        setIsOpen(false)
        if (typeof window !== 'undefined') {
            const snoozeDuration = 30 * 1000 // 30 seconds
            const snoozeUntil = Date.now() + snoozeDuration
            localStorage.setItem('mood_snoozed_until', snoozeUntil.toString())

            if (checkTimeoutRef.current) {
                clearTimeout(checkTimeoutRef.current)
            }
            checkTimeoutRef.current = setTimeout(checkScheduleAndMood, snoozeDuration)
        }
    }

    const handleSubmit = async () => {
        if (!selectedMood) return

        setSubmitting(true)
        try {
            await submitMood(selectedMood, moodType, note || undefined)
            setSubmitted(true)
            setTimeout(() => {
                setIsOpen(false)
                setSubmitted(false)
                setSelectedMood(null)
                setNote('')
            }, 1500)
        } catch (error) {
            console.error('Error submitting mood:', error)
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    const selectedMoodData = MOODS.find(m => m.value === selectedMood)

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Container */}
            <div className={cn(
                "relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden",
                "animate-in fade-in zoom-in-95 duration-300"
            )}>
                {/* Close Button */}
                {!submitted && (
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/50 hover:text-white transition-colors"
                        title="Close for 30 seconds"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                {/* Header gradient */}
                <div className={cn(
                    "relative px-6 pt-8 pb-6 text-center",
                    "bg-gradient-to-br",
                    selectedMoodData ? selectedMoodData.color : "from-blue-500 to-indigo-500",
                    "transition-all duration-500"
                )}>
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="relative">
                        <p className="text-white/80 text-sm font-medium mb-1">
                            {moodType === 'CHECK_IN' ? 'Selamat Datang!' : 'Mau Pulang?'}
                        </p>
                        <h2 className="text-2xl font-bold text-white">
                            {moodType === 'CHECK_IN'
                                ? 'Bagaimana mood kamu hari ini?'
                                : 'Bagaimana mood kamu saat ini?'
                            }
                        </h2>
                        <p className="text-white/70 text-sm mt-2">
                            {moodType === 'CHECK_IN'
                                ? 'Pilih mood untuk memulai harimu'
                                : 'Pilih mood sebelum pulang kerja'
                            }
                        </p>
                    </div>
                </div>

                {/* Success state */}
                {submitted ? (
                    <div className="px-6 py-12 text-center">
                        <div className="text-6xl mb-4 animate-bounce">
                            {selectedMoodData?.emoji || '✅'}
                        </div>
                        <p className="text-lg font-semibold text-foreground">Terima kasih!</p>
                    </div>
                ) : (
                    <>
                        {/* Mood Selection */}
                        <div className="px-6 py-6">
                            <div className="flex items-center justify-center gap-3">
                                {MOODS.map((mood) => (
                                    <button
                                        key={mood.value}
                                        onClick={() => setSelectedMood(mood.value)}
                                        className={cn(
                                            "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200",
                                            "hover:scale-110 active:scale-95",
                                            selectedMood === mood.value
                                                ? `${mood.bg} ring-2 ${mood.ring} scale-110 shadow-lg`
                                                : "hover:bg-muted/50"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-4xl transition-all duration-200",
                                            selectedMood === mood.value ? "scale-110" : "grayscale-[30%]"
                                        )}>
                                            {mood.emoji}
                                        </span>
                                        <span className={cn(
                                            "text-xs font-medium transition-colors",
                                            selectedMood === mood.value
                                                ? "text-foreground"
                                                : "text-muted-foreground"
                                        )}>
                                            {mood.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Note input */}
                        <div className="px-6 pb-4">
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Ceritakan suasana hatimu..."
                                rows={2}
                                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>

                        {/* Submit button */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedMood || submitting}
                                className={cn(
                                    "w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200",
                                    selectedMood
                                        ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
                                        : "bg-muted text-muted-foreground cursor-not-allowed"
                                )}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Kirim Mood
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

