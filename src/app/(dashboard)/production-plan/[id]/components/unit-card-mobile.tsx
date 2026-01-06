'use client'

import { toggleUnitSection, updateUnitSalesData } from '@/app/actions/production-plan'
import { Box, ShoppingBag, AlertTriangle, Hammer, Check } from 'lucide-react'
import { useState, useTransition, useEffect } from 'react'
import ConfirmModal from './confirm-modal'
import IssueModal from './issue-modal'

interface UnitCardMobileProps {
    unit: any
    sections: any[]
}

export default function UnitCardMobile({ unit, sections }: UnitCardMobileProps) {
    const [isPending, startTransition] = useTransition()
    const [completedIds, setCompletedIds] = useState<string[]>(JSON.parse(unit.completed || '[]'))

    const activeIssue = unit.issues?.find((i: any) => !i.isResolved)
    const hasIssue = !!activeIssue

    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
    const [isSalesModalOpen, setIsSalesModalOpen] = useState(false)
    const [isUnitInfoModalOpen, setIsUnitInfoModalOpen] = useState(false)
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    })

    // Temporary states for editing unit info
    const [tempSerial, setTempSerial] = useState(unit.productIdentifier || '')
    const [tempCustomId, setTempCustomId] = useState(unit.customId || '')

    // Sales Data States
    const [isAssembled, setIsAssembled] = useState(!!unit.assembledAt)
    const [isPacked, setIsPacked] = useState(unit.isPacked)
    const [isSold, setIsSold] = useState(unit.isSold)
    const [marketplace, setMarketplace] = useState(unit.marketplace || '')
    const [customer, setCustomer] = useState(unit.customer || '')

    // Calculate if all sections are checked
    const isAllSectionsChecked = sections.length > 0 && sections.every(section => completedIds.includes(section.id))

    // Auto-uncheck Assembled, Packed and Sold when production progress is incomplete
    useEffect(() => {
        if (!isAllSectionsChecked) {
            if (isAssembled) {
                setIsAssembled(false)
                handleSalesUpdate('isAssembled', false)
            }
        }
    }, [isAllSectionsChecked])

    useEffect(() => {
        if (!isAssembled) {
            if (isPacked) {
                setIsPacked(false)
                handleSalesUpdate('isPacked', false)
            }
        }
    }, [isAssembled])

    useEffect(() => {
        if (!isPacked) {
            if (isSold) {
                setIsSold(false)
                handleSalesUpdate('isSold', false)
            }
        }
    }, [isPacked])

    const handleToggle = (itemId: string) => {
        const isCompleted = completedIds.includes(itemId)
        const newCompletedIds = isCompleted
            ? completedIds.filter(id => id !== itemId)
            : [...completedIds, itemId]

        setCompletedIds(newCompletedIds) // Optimistic update

        startTransition(async () => {
            await toggleUnitSection(unit.id, itemId, !isCompleted)
        })
    }

    const handleSalesUpdate = (field: string, value: any) => {
        startTransition(async () => {
            await updateUnitSalesData(unit.id, { [field]: value })
        })
    }

    const handleStatusToggle = (type: 'Assembled' | 'Packed' | 'Sold', currentValue: boolean) => {
        const nextValue = !currentValue

        if (nextValue === false) { // Unchecking requires confirmation
            setConfirmModal({
                isOpen: true,
                title: `Uncheck ${type}?`,
                message: `Are you sure you want to uncheck ${type}?\nThis action cannot be undone and might affect next steps.`,
                onConfirm: () => {
                    updateStatus(type, false)
                    setConfirmModal({ ...confirmModal, isOpen: false }) // Close modal after confirmation
                }
            })
        } else {
            updateStatus(type, true)
        }
    }

    const updateStatus = (type: string, value: boolean) => {
        if (type === 'Assembled') {
            setIsAssembled(value)
            handleSalesUpdate('isAssembled', value)
        } else if (type === 'Packed') {
            setIsPacked(value)
            handleSalesUpdate('isPacked', value)
        } else if (type === 'Sold') {
            setIsSold(value)
            handleSalesUpdate('isSold', value)
        }
    }

    const handleSoldClick = () => {
        if (isPacked) {
            if (!isSold) {
                // Opening modal to input marketplace and customer
                setIsSalesModalOpen(true)
            } else {
                handleStatusToggle('Sold', true) // Will trigger confirm modal for uncheck
            }
        }
    }

    const handleSalesModalSubmit = () => {
        setIsSold(true)
        startTransition(async () => {
            await updateUnitSalesData(unit.id, {
                isSold: true,
                marketplace,
                customer
            })
        })
        setIsSalesModalOpen(false)
    }

    const handleUnitInfoSubmit = async () => {
        startTransition(async () => {
            // Update serial if changed
            if (tempSerial !== unit.productIdentifier) {
                const { updateUnitIdentifier } = await import('@/app/actions/production-plan')
                await updateUnitIdentifier(unit.id, tempSerial)
            }
            // Update custom ID if changed
            if (tempCustomId !== unit.customId) {
                const { updateUnitCustomId } = await import('@/app/actions/production-plan')
                await updateUnitCustomId(unit.id, tempCustomId)
            }
        })
        setIsUnitInfoModalOpen(false)
    }

    return (
        <>
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Yes, Uncheck"
                isDangerous={true}
            />

            <IssueModal
                isOpen={isIssueModalOpen}
                onClose={() => setIsIssueModalOpen(false)}
                unitId={unit.id}
                unitNumber={unit.unitNumber}
                existingIssue={activeIssue}
            />

            {/* Sales Info Modal */}
            {isSalesModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Sales Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Marketplace <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={marketplace}
                                    onChange={(e) => setMarketplace(e.target.value)}
                                    placeholder="e.g., Tokopedia, Shopee"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Customer Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={customer}
                                    onChange={(e) => setCustomer(e.target.value)}
                                    placeholder="Customer name"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setMarketplace(unit.marketplace || '')
                                    setCustomer(unit.customer || '')
                                    setIsSalesModalOpen(false)
                                }}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSalesModalSubmit}
                                disabled={isPending || !marketplace.trim() || !customer.trim()}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {isPending ? 'Saving...' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unit Info Edit Modal */}
            {isUnitInfoModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Unit Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Serial Number
                                </label>
                                <input
                                    type="text"
                                    value={tempSerial}
                                    onChange={(e) => setTempSerial(e.target.value)}
                                    placeholder="Serial number"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Custom ID
                                </label>
                                <input
                                    type="text"
                                    value={tempCustomId}
                                    onChange={(e) => setTempCustomId(e.target.value)}
                                    placeholder="Custom ID"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setTempSerial(unit.productIdentifier || '')
                                    setTempCustomId(unit.customId || '')
                                    setIsUnitInfoModalOpen(false)
                                }}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUnitInfoSubmit}
                                disabled={isPending}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {isPending ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`bg-card border rounded-xl shadow-sm overflow-hidden ${hasIssue ? 'border-red-300 bg-red-50/50' : 'border-border'}`}>
                {/* Header - Clickable to edit unit info */}
                <button
                    onClick={() => setIsUnitInfoModalOpen(true)}
                    className={`w-full p-3 border-b flex items-center justify-between ${hasIssue ? 'bg-red-100/50 border-red-200' : 'bg-muted/30 border-border'} hover:bg-muted/50 transition-colors`}
                >
                    <div className="flex items-center gap-2">
                        <div
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsIssueModalOpen(true)
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${hasIssue ? 'bg-red-500 text-white' : 'bg-primary/10 text-primary'}`}
                        >
                            #{unit.unitNumber}
                        </div>
                        <div className="text-left">
                            <div className="text-xs text-muted-foreground">Serial</div>
                            <div className="font-medium text-sm">{tempSerial || 'No Serial'}</div>
                        </div>
                    </div>
                    {tempCustomId && (
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground">ID</div>
                            <div className="font-mono text-sm">{tempCustomId}</div>
                        </div>
                    )}
                </button>

                {/* Progress Sections */}
                <div className="p-3 border-b border-border">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">Production Progress</div>
                    <div className="grid grid-cols-2 gap-2">
                        {sections.map((section: any) => {
                            const isChecked = completedIds.includes(section.id)
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => handleToggle(section.id)}
                                    disabled={isPending}
                                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${isChecked ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'} ${isPending ? 'opacity-50' : ''}`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${isChecked ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                                        {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                    </div>
                                    <span className="text-xs font-medium truncate text-left">{section.name}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Sales Status */}
                <div className="p-3 bg-indigo-50/30">
                    <div className="text-xs font-semibold text-indigo-900 mb-2">Sales Status</div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-indigo-700">Assembled</span>
                            <button
                                onClick={() => {
                                    if (isAllSectionsChecked) {
                                        handleStatusToggle('Assembled', isAssembled)
                                    }
                                }}
                                disabled={!isAllSectionsChecked || isPending}
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isAssembled ? 'bg-indigo-500 border-indigo-500' : !isAllSectionsChecked ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50' : 'bg-white border-indigo-200'} ${isPending ? 'opacity-50' : ''}`}
                            >
                                {isAssembled && <Hammer className="w-3 h-3 text-white" strokeWidth={2.5} />}
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-indigo-700">Packed</span>
                            <button
                                onClick={() => {
                                    if (isAssembled) {
                                        handleStatusToggle('Packed', isPacked)
                                    }
                                }}
                                disabled={!isAssembled || isPending}
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isPacked ? 'bg-indigo-500 border-indigo-500' : !isAssembled ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50' : 'bg-white border-indigo-200'} ${isPending ? 'opacity-50' : ''}`}
                            >
                                {isPacked && <Box className="w-3 h-3 text-white" strokeWidth={2.5} />}
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-indigo-700">Sold</span>
                            <button
                                onClick={handleSoldClick}
                                disabled={!isPacked || isPending}
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSold ? 'bg-indigo-500 border-indigo-500' : !isPacked ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50' : 'bg-white border-indigo-200'} ${isPending ? 'opacity-50' : ''}`}
                            >
                                {isSold && <ShoppingBag className="w-3 h-3 text-white" strokeWidth={2.5} />}
                            </button>
                        </div>
                        {isSold && (marketplace || customer) && (
                            <div className="pt-2 border-t border-indigo-100 space-y-1">
                                {marketplace && (
                                    <div className="text-xs">
                                        <span className="text-indigo-600">Marketplace:</span> <span className="text-indigo-900 font-medium">{marketplace}</span>
                                    </div>
                                )}
                                {customer && (
                                    <div className="text-xs">
                                        <span className="text-indigo-600">Customer:</span> <span className="text-indigo-900 font-medium">{customer}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Issue Alert */}
                {hasIssue && (
                    <div className="p-3 bg-red-100/50 border-t border-red-200">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="text-xs font-semibold text-red-900">Active Issue</div>
                                <div className="text-xs text-red-700 mt-1">{activeIssue.description}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
