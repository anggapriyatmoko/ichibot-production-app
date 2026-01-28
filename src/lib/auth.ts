import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Roles that have admin-level access
const ADMIN_ROLES = ['ADMIN', 'HRD']

export async function getSession() {
    return await getServerSession(authOptions)
}

export async function getCurrentUser() {
    const session: any = await getServerSession(authOptions)
    return session?.user
}

export async function requireAdmin() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        throw new Error('Unauthorized: Please login')
    }

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
