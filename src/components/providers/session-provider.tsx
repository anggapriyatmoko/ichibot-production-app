'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { IdleTimeoutProvider } from './idle-timeout-provider'

export function SessionProvider({ children, session }: { children: React.ReactNode, session?: any }) {
    return (
        <NextAuthSessionProvider session={session}>
            <IdleTimeoutProvider>
                {children}
            </IdleTimeoutProvider>
        </NextAuthSessionProvider>
    )
}
