import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getRbacConfig } from '@/app/actions/rbac'
import { getCurrentUser } from '@/lib/auth'

/**
 * Server-side RBAC guard. Call this at the top of any page.tsx to enforce access control.
 * If RBAC config exists and the user's role is not allowed, redirects to /dashboard.
 * ADMIN role always has access.
 */
export async function checkRbacAccess(pathname: string) {
    const user = await getCurrentUser()
    if (!user) return // Not logged in, handled by auth middleware

    const userRole = user.role || 'USER'
    if (userRole === 'ADMIN') return // Admin always allowed

    const rbacConfig = await getRbacConfig()
    if (!rbacConfig) return // No RBAC config = allow all

    const allowedRoles = rbacConfig[pathname]
    if (allowedRoles && !allowedRoles.includes(userRole)) {
        redirect('/dashboard?forbidden=1')
    }
}
