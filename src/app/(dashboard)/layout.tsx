import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import { SidebarProvider } from '@/components/providers/sidebar-provider'
import ChatWidget from '@/components/chat/chat-widget'

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

/**
 * Z-INDEX HIERARCHY (for reference when creating modals):
 * - Header: z-30
 * - Sidebar: z-40
 * - Chat Widget: z-50
 * - Modals: z-[100] (MUST be higher than all above)
 * 
 * See: src/components/ui/MODAL_GUIDELINES.md for modal implementation guide
 */

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session: any = await getServerSession(authOptions)

    return (
        <SidebarProvider>
            <div className="flex h-screen bg-background overflow-hidden flex-col md:flex-row">
                <Sidebar userRole={session?.user?.role} />
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Top gradient accent */}
                    <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/5 blur-[120px] pointer-events-none" />

                    {/* Sticky Header - Desktop - z-30 so modals (z-50) can appear above */}
                    <div className="relative z-30 shrink-0">
                        <Header />
                    </div>

                    {/* Scrollable Content - no z-index to avoid creating stacking context */}
                    <div className="flex-1 overflow-auto relative">
                        <div className="px-2 md:px-8 py-4 md:py-8">
                            {children}
                        </div>
                    </div>
                </main>

                {/* Chat Widget - Desktop Only */}
                <ChatWidget />
            </div>
        </SidebarProvider>
    )
}
