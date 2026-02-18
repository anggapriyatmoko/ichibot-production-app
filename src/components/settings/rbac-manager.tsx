'use client'

import { useState, useEffect, useMemo } from 'react'
import { Shield, Save, Loader2 } from 'lucide-react'
import { getRbacConfig, saveRbacConfig, type RbacConfig } from '@/app/actions/rbac'
import { navigationGroups, dashboardItem } from '@/components/layout/sidebar'
import {
    TableWrapper,
    TableHeaderContent,
    TableScrollArea,
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/table'

// All available roles
const ALL_ROLES = ['ADMIN', 'USER', 'TEKNISI', 'EXTERNAL', 'HRD', 'ADMINISTRASI', 'STORE']

// Extract all leaf pages (items with href) from navigation structure
function extractPages(): { name: string; href: string; group: string }[] {
    const pages: { name: string; href: string; group: string }[] = []

    // Dashboard
    pages.push({ name: dashboardItem.name, href: dashboardItem.href, group: 'Dashboard' })

    for (const group of navigationGroups) {
        for (const item of group.items as any[]) {
            if (item.children) {
                for (const child of item.children) {
                    if (child.href) {
                        pages.push({ name: child.name, href: child.href, group: group.label })
                    }
                }
            } else if (item.href) {
                pages.push({ name: item.name, href: item.href, group: group.label })
            }
        }
    }

    return pages
}

export default function RbacManager() {
    const [config, setConfig] = useState<RbacConfig>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const pages = useMemo(() => extractPages(), [])

    // Load existing config
    useEffect(() => {
        async function load() {
            try {
                const existing = await getRbacConfig()
                if (existing) {
                    setConfig(existing)
                } else {
                    // Initialize: all roles get access to all pages by default
                    const initial: RbacConfig = {}
                    for (const page of pages) {
                        initial[page.href] = [...ALL_ROLES]
                    }
                    setConfig(initial)
                }
            } catch (error) {
                console.error('Error loading RBAC config:', error)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [pages])

    const isChecked = (href: string, role: string): boolean => {
        if (role === 'ADMIN') return true // Admin always checked
        const roles = config[href]
        if (!roles) return true // Not configured = allowed
        return roles.includes(role)
    }

    const toggleAccess = (href: string, role: string) => {
        if (role === 'ADMIN') return // Can't toggle admin

        setConfig(prev => {
            const current = prev[href] || [...ALL_ROLES]
            const newRoles = current.includes(role)
                ? current.filter(r => r !== role)
                : [...current, role]
            return { ...prev, [href]: newRoles }
        })
    }

    const handleSave = async () => {
        setSaving(true)
        setSaveMessage(null)
        try {
            const result = await saveRbacConfig(config)
            if (result.success) {
                setSaveMessage({ type: 'success', text: 'Konfigurasi berhasil disimpan!' })
            } else {
                setSaveMessage({ type: 'error', text: result.error || 'Gagal menyimpan' })
            }
        } catch (error: any) {
            setSaveMessage({ type: 'error', text: error.message || 'Terjadi kesalahan' })
        } finally {
            setSaving(false)
            setTimeout(() => setSaveMessage(null), 3000)
        }
    }

    // Group pages by category for display
    const groupedPages = useMemo(() => {
        const groups: Record<string, typeof pages> = {}
        for (const page of pages) {
            if (!groups[page.group]) groups[page.group] = []
            groups[page.group].push(page)
        }
        return groups
    }, [pages])

    return (
        <TableWrapper loading={loading}>
            <TableHeaderContent
                title="Hak Akses (RBAC)"
                description="Kelola hak akses setiap halaman berdasarkan role pengguna. Centang untuk memberi akses, hilangkan centang untuk memblokir."
                icon={<Shield className="w-5 h-5" />}
                actions={
                    <div className="flex items-center gap-3">
                        {saveMessage && (
                            <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${saveMessage.type === 'success'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                {saveMessage.text}
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {saving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                }
            />

            <TableScrollArea>
                <Table>
                    <TableHeader>
                        <TableRow hoverable={false}>
                            <TableHead className="sticky left-0 z-10 bg-muted/50 min-w-[200px]">
                                Halaman
                            </TableHead>
                            {ALL_ROLES.map(role => (
                                <TableHead key={role} align="center" className="min-w-[100px]">
                                    {role}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {Object.entries(groupedPages).map(([groupName, groupPages]) => (
                            <>
                                {/* Group header row */}
                                <TableRow key={`group-${groupName}`} hoverable={false}>
                                    <TableCell
                                        colSpan={ALL_ROLES.length + 1}
                                        className="bg-muted/30 py-2"
                                    >
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            {groupName}
                                        </span>
                                    </TableCell>
                                </TableRow>

                                {/* Page rows */}
                                {groupPages.map(page => (
                                    <TableRow key={page.href}>
                                        <TableCell className="sticky left-0 z-10 bg-card font-medium">
                                            <div>
                                                <span className="text-sm">{page.name}</span>
                                                <span className="block text-[10px] text-muted-foreground font-mono">
                                                    {page.href}
                                                </span>
                                            </div>
                                        </TableCell>
                                        {ALL_ROLES.map(role => (
                                            <TableCell key={role} align="center">
                                                <label className="inline-flex items-center justify-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked(page.href, role)}
                                                        onChange={() => toggleAccess(page.href, role)}
                                                        disabled={role === 'ADMIN'}
                                                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer accent-primary"
                                                    />
                                                </label>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </>
                        ))}
                    </TableBody>

                    <TableFooter>
                        <TableRow hoverable={false}>
                            <TableCell colSpan={ALL_ROLES.length + 1}>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Total: {pages.length} halaman × {ALL_ROLES.length} role</span>
                                    <span className="italic">Role Admin selalu memiliki akses penuh</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </TableScrollArea>
        </TableWrapper>
    )
}
