import { Suspense } from 'react'
import { Metadata } from 'next'
import PriceListManager from '@/components/administrasi/price-list/price-list-manager'
import { getPriceListGroups } from '@/app/actions/price-list'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Daftar Harga | Ichibot',
    description: 'Kelola daftar harga produk dan jasa',
}

export default async function PriceListPage() {
    const initialGroups = await getPriceListGroups()

    return (
        <div className="container mx-auto p-6 space-y-6">

            <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                <PriceListManager initialGroups={initialGroups} />
            </Suspense>
        </div>
    )
}
