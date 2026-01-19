'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { IdleTimeoutProvider } from './idle-timeout-provider'

export function SessionProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextAuthSessionProvider>
            <IdleTimeoutProvider>
                {children}
            </IdleTimeoutProvider>
        </NextAuthSessionProvider>
    )
}
