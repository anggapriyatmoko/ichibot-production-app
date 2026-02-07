import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export default async function POSLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        redirect("/api/auth/signin")
    }

    return (
        <div className="h-screen w-full bg-background overflow-hidden relative">
            {/* Background accent */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-600/5 blur-[120px] pointer-events-none z-0" />

            <div className="relative z-10 h-full flex flex-col">
                {children}
            </div>
        </div>
    )
}
