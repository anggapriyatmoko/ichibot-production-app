import StorePOSSystem from '@/components/store/store-pos-system'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export default async function StorePOSPage() {
    const session = await getServerSession(authOptions)
    const userName = session?.user?.name || "Unknown User"

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <StorePOSSystem userName={userName} />
        </div>
    )
}
