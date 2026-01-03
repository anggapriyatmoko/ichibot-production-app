'use client'

import { updateUnitIdentifier, toggleUnitIngredient, updateUnitSalesData } from '@/app/actions/production-plan'
import { Check, Box, ShoppingBag } from 'lucide-react'
import { useState, useTransition } from 'react'

interface UnitRowProps {
    unit: any
    items: any[]
}

export default function UnitRow({ unit, items }: UnitRowProps) {
    const [isPending, startTransition] = useTransition()
    const [completedIds, setCompletedIds] = useState<string[]>(JSON.parse(unit.completed))
    const [identifier, setIdentifier] = useState(unit.productIdentifier || '')

    // Sales Data States
    const [isPacked, setIsPacked] = useState(unit.isPacked)
    const [isSold, setIsSold] = useState(unit.isSold)
    const [marketplace, setMarketplace] = useState(unit.marketplace || '')
    const [customer, setCustomer] = useState(unit.customer || '')

    // Calculate if all sections are checked
    const isAllSectionsChecked = items.length > 0 && items.every(item => completedIds.includes(item.id))

    const handleToggle = (itemId: string) => {
        const isCompleted = completedIds.includes(itemId)
        const newCompletedIds = isCompleted
            ? completedIds.filter(id => id !== itemId)
            : [...completedIds, itemId]

        setCompletedIds(newCompletedIds) // Optimistic update

        startTransition(async () => {
            await toggleUnitIngredient(unit.id, itemId, !isCompleted)
        })
    }

    const handleIdentifierBlur = () => {
        if (identifier !== unit.productIdentifier) {
            startTransition(async () => {
                await updateUnitIdentifier(unit.id, identifier)
            })
        }
    }

    const handleSalesUpdate = (field: string, value: any) => {
        startTransition(async () => {
            await updateUnitSalesData(unit.id, { [field]: value })
        })
    }

    return (
        <tr className="hover:bg-accent/30 transition-colors">
            <td className="px-2 py-1 text-center border-r border-border font-medium text-muted-foreground sticky left-0 bg-card z-10 group-hover:bg-accent/30 text-[10px]">
                {unit.unitNumber}
            </td>
            <td className="px-2 py-1 border-r border-border sticky left-12 bg-card z-10 group-hover:bg-accent/30">
                <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onBlur={handleIdentifierBlur}
                    placeholder="Enter Serial No..."
                    className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-2 py-0.5 outline-none text-[10px] font-mono transition-all h-6"
                />
            </td>
            {items.map(item => {
                const isChecked = completedIds.includes(item.id)
                return (
                    <td key={item.id} className="px-2 py-1 text-center border-r border-border">
                        <button
                            onClick={() => handleToggle(item.id)}
                            className={`
                                w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 mx-auto
                                ${isChecked
                                    ? 'bg-primary border-primary text-primary-foreground shadow-sm scale-100'
                                    : 'bg-transparent border-gray-300 dark:border-gray-700 hover:border-primary/50 text-transparent scale-90 hover:scale-100'
                                }
                            `}
                        >
                            <Check className="w-3 h-3" strokeWidth={3} />
                        </button>
                    </td>
                )
            })}

            {/* Sales & Packing Cells - Distinct Styling */}
            <td className="px-2 py-1 text-center border-r border-indigo-100 bg-indigo-50/30 border-l">
                <button
                    onClick={() => {
                        if (isAllSectionsChecked) {
                            setIsPacked(!isPacked)
                            handleSalesUpdate('isPacked', !isPacked)
                        }
                    }}
                    disabled={!isAllSectionsChecked}
                    className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 mx-auto
                        ${isPacked
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm scale-100'
                            : !isAllSectionsChecked
                                ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                : 'bg-white border-indigo-200 hover:border-indigo-400 text-transparent scale-90 hover:scale-100'
                        }
                    `}
                >
                    <Box className="w-2.5 h-2.5" strokeWidth={2.5} />
                </button>
            </td>
            <td className="px-2 py-1 text-center border-r border-indigo-100 bg-indigo-50/30">
                <button
                    onClick={() => {
                        setIsSold(!isSold)
                        handleSalesUpdate('isSold', !isSold)
                    }}
                    className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 mx-auto
                        ${isSold
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm scale-100'
                            : 'bg-white border-indigo-200 hover:border-indigo-400 text-transparent scale-90 hover:scale-100'
                        }
                    `}
                >
                    <ShoppingBag className="w-2.5 h-2.5" strokeWidth={2.5} />
                </button>
            </td>
            <td className="px-2 py-1 border-r border-indigo-100 bg-indigo-50/30">
                <input
                    type="text"
                    value={marketplace}
                    onChange={(e) => setMarketplace(e.target.value)}
                    onBlur={(e) => handleSalesUpdate('marketplace', e.target.value)}
                    placeholder="Tokopedia"
                    className="w-full bg-white/50 border border-indigo-100 hover:border-indigo-300 focus:border-indigo-500 rounded px-2 py-0.5 outline-none text-[10px] text-indigo-900 placeholder:text-indigo-300 transition-all h-6"
                />
            </td>
            <td className="px-2 py-1 bg-indigo-50/30">
                <input
                    type="text"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    onBlur={(e) => handleSalesUpdate('customer', e.target.value)}
                    placeholder="Customer Name"
                    className="w-full bg-white/50 border border-indigo-100 hover:border-indigo-300 focus:border-indigo-500 rounded px-2 py-0.5 outline-none text-[10px] text-indigo-900 placeholder:text-indigo-300 transition-all h-6"
                />
            </td>
        </tr>
    )
}
