import { requireAuth } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import RackManager from "@/components/settings/rack-manager"

export const metadata = {
    title: 'Rack Management | Ichibot Production',
    description: 'Manage sparepart rack storage',
}

export default async function RackManagementPage() {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    const userRole = session?.user?.role

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold mb-8">Rack Management</h1>
            <RackManager userRole={userRole} />
        </div>
    )
}
