import Sidebar from '@/components/layout/sidebar'
import UserProfile from '@/components/layout/user-profile'
import { ModeToggle } from "@/components/mode-toggle"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar userProfile={<UserProfile />} />
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
