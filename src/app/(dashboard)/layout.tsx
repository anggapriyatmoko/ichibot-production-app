import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import { SidebarProvider } from '@/components/providers/sidebar-provider'

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

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

                    <div className="flex-1 overflow-auto relative z-10">
                        <Header />
                        <div className="px-2 md:px-8 py-4 md:py-8">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </SidebarProvider>
    )
}
