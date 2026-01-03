import Sidebar from '@/components/layout/sidebar'
import UserProfile from '@/components/layout/user-profile'
import { ModeToggle } from "@/components/mode-toggle"

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session: any = await getServerSession(authOptions)

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar userProfile={<UserProfile />} userRole={session?.user?.role} />
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Top gradient accent */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/5 blur-[120px] pointer-events-none" />

                {/* Theme Toggle - Top Right */}
                <div className="absolute top-6 right-8 z-50">
                    <ModeToggle />
                </div>

                <div className="flex-1 overflow-auto p-8 relative z-10">
                    {children}
                </div>
            </main>
        </div>
    )
}
