'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, X, Loader2, CheckCircle, Edit2 } from 'lucide-react'
import { reportIssue, resolveIssue, updateIssue } from '@/app/actions/production-plan'

import { createPortal } from 'react-dom'

interface IssueModalProps {
    isOpen: boolean
    onClose: () => void
    unitId: string
    unitNumber: number
    existingIssue?: { id: string, description: string } | null
    initialResolveMode?: boolean
}

export default function IssueModal({ isOpen, onClose, unitId, unitNumber, existingIssue, initialResolveMode = false }: IssueModalProps) {
    const [mounted, setMounted] = useState(false)
    const [description, setDescription] = useState('')
    const [resolution, setResolution] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isConfirmingResolve, setIsConfirmingResolve] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setDescription(existingIssue ? existingIssue.description : '')
            setResolution('') // Reset resolution
            setIsEditing(!existingIssue)
            setIsConfirmingResolve(initialResolveMode) // Initialize based on prop
            setIsSubmitting(false)

            // Focus after animation only if editing
            if (!existingIssue) {
                setTimeout(() => {
                    textareaRef.current?.focus()
                }, 100)
            }
        }
    }, [isOpen, existingIssue, initialResolveMode])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!description.trim()) return

        // If existing issue, default to edit behavior (Update) unless "Solved" button used specialized handler
        handleUpdate()
    }

    const handleUpdate = async () => {
        // If not in editing mode, switch to editing
        if (existingIssue && !isEditing) {
            setIsEditing(true)
            setTimeout(() => {
                textareaRef.current?.focus()
            }, 50)
            return
        }

        if (!description.trim()) return
        setIsSubmitting(true)
        try {
            if (existingIssue) {
                await updateIssue(existingIssue.id, description)
                setIsEditing(false)
            } else {
                await reportIssue(unitId, description)
                onClose()
            }
        } catch (error) {
            console.error('Failed to save issue:', error)
            alert('Failed to save. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleResolveClick = () => {
        setIsConfirmingResolve(true)
    }

    const confirmResolve = async () => {
        if (!existingIssue) return
        if (!resolution.trim()) return // Validate resolution

        setIsSubmitting(true)
        try {
            await resolveIssue(existingIssue.id, resolution)
            onClose()
        } catch (error) {
            console.error('Failed to resolve issue:', error)
            alert('Failed to resolve. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!mounted || !isOpen) return null

    // Confirmation View
    if (isConfirmingResolve) {
        return createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-500/10 backdrop-blur-sm animate-in fade-in duration-200">
                <div
                    className="bg-background w-full max-w-md rounded-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-border overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 space-y-4">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Mark as Solved?</h3>
                            <p className="text-sm text-muted-foreground whitespace-normal break-words max-w-full px-4 mb-4">
                                Please describe how this issue was resolved before closing it.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                                Resolution Details
                            </label>
                            <textarea
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                placeholder="e.g., Replaced the broken sensor, Updated firmware..."
                                className="w-full h-24 p-3 bg-background border border-border rounded-xl focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm outline-none resize-none transition-all placeholder:text-muted-foreground/50"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => {
                                    if (initialResolveMode) {
                                        onClose()
                                    } else {
                                        setIsConfirmingResolve(false)
                                    }
                                }}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmResolve}
                                disabled={isSubmitting || !resolution.trim()}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Yes, Solved'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-500/10 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-background w-full max-w-md rounded-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-border overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Clean & Simple */}
                <div className="bg-background p-6 border-b border-border flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <AlertTriangle className={`w-5 h-5 ${existingIssue ? 'text-red-500' : 'text-amber-500'}`} />
                            {existingIssue ? 'Manage Production Issue' : 'Report Production Issue'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            {existingIssue ? `Reviewing issue on Unit #${unitNumber}` : `Flagging Unit #${unitNumber} as problematic.`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground/80 block">
                            Describe the issue or blocker
                        </label>
                        <textarea
                            ref={textareaRef}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Waiting for sparepart X, Machine failure, Paint defect..."
                            className={`w-full h-32 p-4 bg-background border rounded-xl focus:ring-1 focus:ring-orange-400 focus:border-orange-400 text-foreground text-base outline-none resize-none transition-all placeholder:text-muted-foreground/50 ${isEditing
                                ? 'border-orange-200 dark:border-orange-800'
                                : 'border-border text-foreground'
                                }`}
                            disabled={isSubmitting || !isEditing}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        {existingIssue ? (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResolveClick}
                                    disabled={isSubmitting}
                                    className="px-4 py-2.5 text-sm font-bold text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Solved
                                </button>
                                <button
                                    type="button" // Change to button to prevent form submit default
                                    onClick={handleUpdate}
                                    disabled={isSubmitting || (isEditing && !description.trim())}
                                    className={`px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all ${isEditing
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                                    {isEditing ? 'Save Changes' : 'Edit'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!description.trim() || isSubmitting}
                                    className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 rounded-xl shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Report Issue
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
