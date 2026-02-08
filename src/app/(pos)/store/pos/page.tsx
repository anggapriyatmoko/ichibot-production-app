import StorePOSSystem from '@/components/store/store-pos-system'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function StorePOSPage() {
    const authSession = await requireAuth();
    if (authSession.user.role === 'EXTERNAL') {
        redirect('/dashboard');
    }
    const session = await getServerSession(authOptions)
    const userName = session?.user?.name || "Unknown User"

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <StorePOSSystem userName={userName} />
        </div>
    )
}
