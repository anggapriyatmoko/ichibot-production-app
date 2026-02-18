'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { RbacConfig } from '@/app/actions/rbac'

/**
 * Client-side RBAC guard. Checks access on every route change.
 * Redirects to /dashboard if the current path is not allowed for the user's role.
 */
export default function RbacGuard({
    userRole,
    rbacConfig
}: {
    userRole: string;
    rbacConfig: RbacConfig | null
}) {
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        if (!rbacConfig) return // No config = allow all
        if (userRole === 'ADMIN') return // Admin always allowed
        if (pathname === '/dashboard') return // Dashboard always allowed

        const allowedRoles = rbacConfig[pathname]
        if (allowedRoles && !allowedRoles.includes(userRole)) {
            router.replace('/dashboard?forbidden=1')
        }
    }, [pathname, rbacConfig, userRole, router])

    return null
}
