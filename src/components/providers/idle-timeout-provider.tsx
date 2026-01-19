'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useIdleTimeout } from '@/hooks/use-idle-timeout'
import { SessionTimeoutWarning } from '@/components/auth/session-timeout-warning'

// Configuration
const IDLE_TIMEOUT = 60 * 60 * 1000 // 1 hour in milliseconds
const WARNING_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

interface IdleTimeoutProviderProps {
    children: React.ReactNode
}

export function IdleTimeoutProvider({ children }: IdleTimeoutProviderProps) {
    const { data: session, status } = useSession()
    const router = useRouter()

    const handleLogout = async () => {
        await signOut({ redirect: false })
        router.push('/login?expired=true')
    }

    const { isWarningVisible, remainingSeconds, extendSession } = useIdleTimeout({
        timeout: IDLE_TIMEOUT,
        warningDuration: WARNING_DURATION,
        onWarning: () => {
            // Optional: Could log or track warning shown
            console.log('Session timeout warning shown')
        },
        onTimeout: () => {
            handleLogout()
        },
        onExtend: () => {
            console.log('Session extended by user')
        }
    })

    // Don't render timeout logic if not authenticated
    if (status !== 'authenticated' || !session) {
        return <>{children}</>
    }

    return (
        <>
            {children}
            {isWarningVisible && (
                <SessionTimeoutWarning
                    remainingSeconds={remainingSeconds}
                    onExtend={extendSession}
                    onLogout={handleLogout}
                />
            )}
        </>
    )
}
