import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import MobileHeader from '@/components/layout/mobile-header'
import { SidebarProvider } from '@/components/providers/sidebar-provider'
import ChatWidget from '@/components/chat/chat-widget'
import RbacGuard from '@/components/providers/rbac-guard'

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getRbacConfig } from "@/app/actions/rbac"

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
    const rbacConfig = await getRbacConfig()
    const userRole = session?.user?.role || ""

    return (
        <SidebarProvider>
            <RbacGuard userRole={userRole} rbacConfig={rbacConfig} />
            <div className="flex h-dvh bg-background flex-col md:flex-row overflow-hidden">
                <Sidebar userRole={userRole} rbacConfig={rbacConfig} />

                {/* Main content wrapper - Underlay Blue for left-side curves */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0 relative bg-blue-600">
                    <main
                        className="flex-1 flex flex-col min-h-0 min-w-0 relative overflow-hidden bg-background md:rounded-l-[24px]"
                    >
                        {/* Top gradient accent */}
                        <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/5 blur-[120px] pointer-events-none z-0" />

                        {/* Header - Desktop Only */}
                        <div className="hidden md:block relative z-30 shrink-0 bg-background">
                            <Header />
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto overscroll-contain relative z-10">
                            {/* Mobile Header - Scrolls with content */}
                            <div className="md:hidden">
                                <MobileHeader />
                            </div>

                            <div className="px-2 md:px-8 py-4 md:py-8 pb-8">
                                {children}
                            </div>
                        </div>
                    </main>
                </div>

                {/* Chat Widget - Desktop Only */}
                <ChatWidget />
            </div>
        </SidebarProvider >
    )
}
