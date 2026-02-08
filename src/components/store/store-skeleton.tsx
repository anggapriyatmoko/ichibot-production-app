import { Search, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StoreSkeleton({ showSyncButton = true, showSupplierColumn = true }: { showSyncButton?: boolean, showSupplierColumn?: boolean }) {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <div className="w-full h-10 bg-muted rounded-lg border border-border" />
                </div>
                {showSyncButton && (
                    <div className="w-full md:w-[140px] h-10 bg-muted rounded-lg" />
                )}
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="px-4 py-3 w-10"><div className="h-4 w-4 bg-muted rounded mx-auto" /></th>
                                <th className="px-4 py-3 w-16"><div className="h-10 w-10 bg-muted rounded-lg mx-auto" /></th>
                                <th className="px-4 py-3"><div className="h-4 w-32 bg-muted rounded" /></th>
                                {showSupplierColumn && <th className="px-4 py-3"><div className="h-4 w-24 bg-muted rounded" /></th>}
                                <th className="px-4 py-3"><div className="h-4 w-16 bg-muted rounded" /></th>
                                <th className="px-4 py-3"><div className="h-4 w-40 bg-muted rounded" /></th>
                                <th className="px-4 py-3"><div className="h-4 w-12 bg-muted rounded ml-auto" /></th>
                                <th className="px-4 py-3"><div className="h-4 w-20 bg-muted rounded ml-auto" /></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-4"><div className="h-5 w-5 bg-muted rounded-full mx-auto" /></td>
                                    <td className="px-4 py-4"><div className="h-12 w-12 bg-muted rounded-lg mx-auto" /></td>
                                    <td className="px-4 py-4">
                                        <div className="space-y-2">
                                            <div className="h-4 w-full bg-muted rounded" />
                                            <div className="h-3 w-24 bg-muted rounded opacity-50" />
                                        </div>
                                    </td>
                                    {showSupplierColumn && <td className="px-4 py-4"><div className="h-8 w-full bg-muted rounded" /></td>}
                                    <td className="px-4 py-4"><div className="h-6 w-16 bg-muted rounded mx-auto" /></td>
                                    <td className="px-4 py-4"><div className="h-10 w-full bg-muted rounded" /></td>
                                    <td className="px-4 py-4"><div className="h-4 w-12 bg-muted rounded ml-auto" /></td>
                                    <td className="px-4 py-4"><div className="h-4 w-20 bg-muted rounded ml-auto" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
