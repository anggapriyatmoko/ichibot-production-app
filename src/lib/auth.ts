import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function getSession() {
    return await getServerSession(authOptions)
}

export async function requireAdmin() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        throw new Error('Unauthorized: Please login')
    }

    if (session.user.role !== 'ADMIN') {
        throw new Error('Forbidden: Admin access required')
    }

    return session
}

export async function getUserRole() {
    const session: any = await getServerSession(authOptions)
    return session?.user?.role || null
}
