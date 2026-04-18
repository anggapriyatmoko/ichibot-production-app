import POSBarangSystem from '@/components/pos/pos-barang-system'
import { getPosBarangProductsPaginated } from '@/app/actions/pos-barang'
import { getSession } from '@/lib/auth'


export default async function POSBarangPage() {
    const session = await getSession()
    const userName = session?.user?.name || "Unknown User"

    // Load only the first 50 items for the initial paint. Search + source
    // filter trigger server-side refetches (see getPosBarangProductsPaginated).
    const initial = await getPosBarangProductsPaginated({
        page: 1,
        perPage: 50,
        source: 'all',
    })

    return (
        <div className="h-full">
            <POSBarangSystem
                initialProducts={initial.products}
                initialTotalCount={initial.totalCount}
                perPage={initial.perPage}
                userName={userName}
            />
        </div>
    )
}
