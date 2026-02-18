import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getRbacConfig } from '@/app/actions/rbac'

// Roles that have admin-level access (legacy fallback when no RBAC config)
const ADMIN_ROLES = ['ADMIN', 'HRD', 'ADMINISTRASI']

export async function getSession() {
    return await getServerSession(authOptions)
}

export async function getCurrentUser() {
    const session: any = await getServerSession(authOptions)
    return session?.user
}

/**
 * Require admin access.
 * When RBAC config exists, uses RBAC as the sole authority for page access.
 * Falls back to hardcoded ADMIN_ROLES check when no RBAC config.
 * 
 * @param pathname - Optional pathname to check RBAC against. If not provided
 *                   and RBAC config exists, the function will allow access
 *                   (RBAC enforcement happens elsewhere via RbacGuard).
 */
export async function requireAdmin(pathname?: string) {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        throw new Error('Unauthorized: Please login')
    }

    // Admin always passes
    if (session.user.role === 'ADMIN') {
        return session
    }

    // Check RBAC config
    try {
        const rbacConfig = await getRbacConfig()
        if (rbacConfig) {
            // When RBAC config exists, it is the sole authority.
            // If pathname is provided, check it.
            // If not provided, allow access (RbacGuard handles route blocking).
            if (pathname) {
                const allowedRoles = rbacConfig[pathname]
                if (allowedRoles && !allowedRoles.includes(session.user.role)) {
                    throw new Error('Forbidden: Akses ditolak')
                }
            }
            // RBAC mode: allow through (sidebar + RbacGuard handle visibility)
            return session
        }
    } catch (error: any) {
        // Re-throw if it's our own error
        if (error?.message === 'Forbidden: Akses ditolak') {
            throw error
        }
        // Otherwise fall through to legacy check
    }

    // Legacy fallback (no RBAC config)
    if (!ADMIN_ROLES.includes(session.user.role)) {
        throw new Error('Forbidden: Admin access required')
    }

    return session
}

export async function requireAuth() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        throw new Error('Unauthorized: Please login')
    }

    return session
}

export async function getUserRole() {
    const session: any = await getServerSession(authOptions)
    return session?.user?.role || null
}

// Helper to check if a role has admin privileges (for frontend use)
export function isAdminRole(role: string | undefined | null): boolean {
    return ADMIN_ROLES.includes(role || '')
}

/**
 * Check if user's role is allowed for a path based on RBAC config.
 * If RBAC config exists, it's the sole authority.
 * If RBAC config doesn't exist, uses the provided allowedRoles (legacy).
 */
export async function isAllowedForPage(pathname: string, legacyAllowedRoles?: string[]): Promise<boolean> {
    const session: any = await getServerSession(authOptions)
    if (!session?.user) return false

    const userRole = session.user.role || 'USER'
    if (userRole === 'ADMIN') return true

    const rbacConfig = await getRbacConfig()
    if (rbacConfig) {
        const allowedRoles = rbacConfig[pathname]
        if (!allowedRoles) return true // Not managed by RBAC
        return allowedRoles.includes(userRole)
    }

    // Legacy fallback
    if (legacyAllowedRoles) {
        return legacyAllowedRoles.includes(userRole)
    }
    return true
}
