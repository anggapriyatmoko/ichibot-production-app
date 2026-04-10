import { requireAuth } from "@/lib/auth"
import RackManager from "@/components/settings/rack-manager"

export const metadata = {
    title: 'Rack Management | Ichibot Production',
    description: 'Manage sparepart rack storage',
}

export default async function RackManagementPage() {
    const session: any = await requireAuth()
    const userRole = session?.user?.role

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold mb-8">Rack Management</h1>
            <RackManager userRole={userRole} />
        </div>
    )
}
