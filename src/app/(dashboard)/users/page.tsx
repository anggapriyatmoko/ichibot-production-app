import { getUsers } from '@/app/actions/user'
import UserTable from '@/components/users/user-table'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    const users = await getUsers()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2 flex items-center gap-3">
                    <Users className="w-8 h-8 text-primary" />
                    User Management
                </h1>
                <p className="text-muted-foreground">Manage system users, roles, and access permissions.</p>
            </div>

            <UserTable users={users} />
        </div>
    )
}
