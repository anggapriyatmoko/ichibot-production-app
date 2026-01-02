import prisma from '@/lib/prisma'
import { History, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'



export default async function HistoryPage() {
    const transactions = await prisma.transaction.findMany({
        include: {
            product: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Transaction History</h1>
                <p className="text-gray-400">Log of all inventory movements (Stock In & Out).</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-white/5 text-gray-200 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4 text-right">Quantity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        {new Date(tx.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {tx.type === 'IN' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                                                <ArrowDownLeft className="w-3 h-3" />
                                                Stock In
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/20">
                                                <ArrowUpRight className="w-3 h-3" />
                                                Checkout
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-white font-medium">
                                        {tx.product?.name || 'Unknown Product'}
                                    </td>
                                    <td className={cn("px-6 py-4 text-right font-bold text-base", tx.type === 'IN' ? 'text-emerald-400' : 'text-blue-400')}>
                                        {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        No transactions recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
