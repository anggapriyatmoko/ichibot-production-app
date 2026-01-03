'use client'

import { useState } from 'react'
import { Download, Upload, AlertTriangle, Database, Check, Loader2, FileJson } from 'lucide-react'
import { exportDatabase, importDatabase } from '@/app/actions/backup'

export default function BackupManager() {
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [importFile, setImportFile] = useState<File | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleExport = async () => {
        setIsExporting(true)
        setMessage(null)
        try {
            const result = await exportDatabase()
            if (result.success && result.data) {
                const blob = new Blob([result.data], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `production-backup-${new Date().toISOString().split('T')[0]}.json`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                setMessage({ type: 'success', text: 'Backup downloaded successfully.' })
            } else {
                setMessage({ type: 'error', text: result.error || 'Export failed' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred during export.' })
        } finally {
            setIsExporting(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setImportFile(e.target.files[0])
            setMessage(null)
        }
    }

    const handleRestore = async () => {
        if (!importFile) return

        // Final Confirmation
        const confirmMsg = "WARNING: This will DELETE ALL CURRENT DATA and replace it with the backup. This action cannot be undone.\n\nAre you sure you want to proceed?"
        if (!window.confirm(confirmMsg)) return

        setIsImporting(true)
        setMessage(null)

        const reader = new FileReader()
        reader.onload = async (e) => {
            const content = e.target?.result as string
            if (!content) return

            try {
                const result = await importDatabase(content)
                if (result.success) {
                    setMessage({ type: 'success', text: 'Database restored successfully! Please refresh or re-login.' })
                    setImportFile(null)
                    // Optional: reload page after delay
                    setTimeout(() => window.location.reload(), 2000)
                } else {
                    setMessage({ type: 'error', text: result.error || 'Import failed' })
                }
            } catch (err) {
                setMessage({ type: 'error', text: 'Failed to process backup file.' })
            } finally {
                setIsImporting(false)
            }
        }
        reader.readAsText(importFile)
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                    <Database className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Data Management</h2>
                    <p className="text-muted-foreground">Backup and restore your entire system data.</p>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                    } border`}>
                    {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <p>{message.text}</p>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                {/* Export Card */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-4 text-blue-600">
                        <Download className="w-5 h-5" />
                        <h3 className="font-semibold text-lg">Export Data</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6 flex-1">
                        Download a full copy of your database including users, products, recipes, and transactions as a JSON file.
                        Use this before making major changes.
                    </p>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download Backup
                    </button>
                </div>

                {/* Import Card */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-4 text-amber-600">
                        <Upload className="w-5 h-5" />
                        <h3 className="font-semibold text-lg">Restore Data</h3>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-400 mb-6 flex gap-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p>
                            <strong>Warning:</strong> Restoring will <u>WIPE ALL EXISTING DATA</u> and replace it with the backup content. This action is irreversible.
                        </p>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="hidden"
                                id="backup-file"
                                disabled={isImporting}
                            />
                            <label
                                htmlFor="backup-file"
                                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${importFile
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                                        : 'border-border hover:bg-muted/50'
                                    }`}
                            >
                                {importFile ? (
                                    <>
                                        <FileJson className="w-8 h-8 text-emerald-500 mb-2" />
                                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{importFile.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Click to change</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                        <p className="text-sm font-medium text-muted-foreground">Click to upload backup file</p>
                                        <p className="text-xs text-muted-foreground/50 mt-1">.json files only</p>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={handleRestore}
                        disabled={isImporting || !importFile}
                        className="w-full py-3 mt-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Restore Database
                    </button>
                </div>
            </div>
        </div>
    )
}
