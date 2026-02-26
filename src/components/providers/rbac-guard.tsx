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

        // Extract base path (e.g., /store/product -> /store/product, but /hrd-dashboard?tab=... -> /hrd-dashboard)
        // Note: pathname from usePathname already excludes search params. 
        // We just need to ensure the lookup matches the config keys exactly.
        const allowedRoles = rbacConfig[pathname]
        if (allowedRoles && !allowedRoles.includes(userRole)) {
            // Check if there is a broader wildcard matching or base path matching if needed
            // Currently config keys are exact like "/hrd-dashboard"
            router.replace('/dashboard?forbidden=1')
        } else if (!allowedRoles) {
            // If the exact pathname is not found, try to find a base path match
            // For example, if pathname is /catalogue/123, check if /catalogue is allowed
            const pathSegments = pathname.split('/').filter(Boolean)
            if (pathSegments.length > 1) {
                const basePath = `/${pathSegments[0]}`
                const baseAllowedRoles = rbacConfig[basePath]
                if (baseAllowedRoles && !baseAllowedRoles.includes(userRole)) {
                    router.replace('/dashboard?forbidden=1')
                }
            }
        }
    }, [pathname, rbacConfig, userRole, router])

    return null
}
