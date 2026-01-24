'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Clock, User, ChevronRight, Inbox, BrainCircuit, AlertTriangle } from 'lucide-react'
import { getPendingOvertimeLeaveCount, getPendingOvertimeLeavesDetails } from '@/app/actions/overtime-leave'
import { getUnresolvedProductionIssuesCount, getUnresolvedProductionIssuesDetails } from '@/app/actions/production-plan'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function NotificationBadge({ role }: { role: string }) {
    const [count, setCount] = useState(0)
    const [hrNotifications, setHrNotifications] = useState<any[]>([])
    const [neuralNotifications, setNeuralNotifications] = useState<any[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const isAdmin = role === 'ADMIN'
    const isHRD = role === 'HRD'
    const isTeknisi = role === 'TEKNISI'

    const canSeeHR = isAdmin || isHRD
    const canSeeNeural = isAdmin || isTeknisi
    const isAllowed = canSeeHR || canSeeNeural

    const fetchData = async () => {
        const promises: Promise<any>[] = []

        // HR Promise slots (0, 1)
        if (canSeeHR) {
            promises.push(getPendingOvertimeLeaveCount())
            promises.push(getPendingOvertimeLeavesDetails())
        } else {
            promises.push(Promise.resolve({ success: true, count: 0 }))
            promises.push(Promise.resolve({ success: true, data: [] }))
        }

        // Neural Promise slots (2, 3)
        if (canSeeNeural) {
            promises.push(getUnresolvedProductionIssuesCount())
            promises.push(getUnresolvedProductionIssuesDetails())
        } else {
            promises.push(Promise.resolve({ success: true, count: 0 }))
            promises.push(Promise.resolve({ success: true, data: [] }))
        }

        const [hrCount, hrDetails, neuralCount, neuralDetails] = await Promise.all(promises)

        let totalCount = 0
        if (hrCount?.success) totalCount += (hrCount.count || 0)
        if (neuralCount?.success) totalCount += (neuralCount.count || 0)

        setCount(totalCount)
        if (hrDetails?.success) setHrNotifications(hrDetails.data || [])
        if (neuralDetails?.success) setNeuralNotifications(neuralDetails.data || [])
    }

    useEffect(() => {
        if (!isAllowed) return
        fetchData()
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [isAllowed])

    // Combine and sort notifications
    const allNotifications = [
        ...hrNotifications.map(n => ({ ...n, source: 'HR' })),
        ...neuralNotifications.map(n => ({ ...n, source: 'NEURAL' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (!isAllowed) return null

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all group",
                    isOpen && "bg-accent text-foreground"
                )}
                title={`${count} Notifikasi`}
            >
                <Bell className={cn("h-6 w-6 transition-transform", !isOpen && "group-hover:rotate-12")} />

                {count > 0 && (
                    <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-background animate-in zoom-in duration-300 shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                        {count > 9 ? '9+' : count}
                        {!isOpen && <span className="absolute inset-0 rounded-full animate-ping bg-rose-500/40 -z-10" />}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="fixed md:absolute left-4 right-4 md:left-auto md:right-0 mt-3 md:w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-5 duration-200 z-[100]">
                    <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                            <Bell className="w-4 h-4 text-primary" />
                            Notifikasi
                        </h3>
                        {count > 0 && (
                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[10px] font-bold rounded-full border border-rose-500/20">
                                {count} Baru
                            </span>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {allNotifications.length === 0 ? (
                            <div className="p-6 text-center flex flex-col items-center gap-2">
                                <Inbox className="w-5 h-5 text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Tidak ada notifikasi</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {allNotifications.map((notif) => (
                                    notif.source === 'NEURAL' ? (
                                        <Link
                                            key={notif.id}
                                            href={`/production-plan/${notif.productionUnit.productionPlanId}`}
                                            onClick={() => setIsOpen(false)}
                                            className="p-3 flex gap-3 hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="w-8 h-8 shrink-0 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold text-[10px] border border-amber-500/20">
                                                <BrainCircuit className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                                                        Neural Detection
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(notif.createdAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-muted-foreground truncate flex-1">
                                                        {notif.productionUnit.productionPlan.recipe.name} - #{notif.productionUnit.unitNumber}
                                                    </p>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Active Anomaly" />
                                                </div>
                                                <p className="text-[10px] text-amber-600 font-medium truncate mt-0.5">
                                                    {notif.description}
                                                </p>
                                            </div>
                                        </Link>
                                    ) : (
                                        <Link
                                            key={notif.id}
                                            href="/hrd-dashboard"
                                            onClick={() => setIsOpen(false)}
                                            className="p-3 flex gap-3 hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] border border-primary/20">
                                                {notif.user.name?.[0] || notif.user.username[0].toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                                                        {notif.user.name || notif.user.username}
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(notif.createdAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-muted-foreground truncate flex-1">
                                                        {notif.type === 'LEAVE' ? 'Mengajukan Izin' :
                                                            notif.type === 'VACATION' ? 'Mengajukan Cuti' : 'Mengajukan Lembur'}
                                                    </p>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Pending" />
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )
            }
        </div >
    )
}
