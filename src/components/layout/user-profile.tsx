import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { User, Shield } from "lucide-react"

export default async function UserProfile() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) return null

    return (
        <div className="flex items-center gap-3 px-3 py-2 bg-accent/50 rounded-lg border border-border">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
                <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{session.user?.name}</p>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-500" />
                        <p className="text-xs text-muted-foreground truncate capitalize">{session.user?.role || 'User'}</p>
                    </div>
                    {session.user?.department && (
                        <p className="text-xs text-muted-foreground truncate">{session.user.department}</p>
                    )}
                </div>
            </div>
        </div>

    )
}
