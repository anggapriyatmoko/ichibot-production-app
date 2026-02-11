'use client'

import { useState } from 'react'
import { Edit2, Trash2, Search, UserPlus, Shield, User as UserIcon, Loader2 } from 'lucide-react'
import { deleteUser } from '@/app/actions/user'
import UserDialog from './user-dialog'
import {
    TableWrapper,
    TableScrollArea,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
    TableHeaderContent,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface UserTableProps {
    users: any[]
}

export default function UserTable({ users }: UserTableProps) {
    const [search, setSearch] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<any>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.username?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())
    )

    const handleEdit = (user: any) => {
        setEditingUser(user)
        setIsDialogOpen(true)
    }

    const handleAdd = () => {
        setEditingUser(null)
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return

        setIsDeleting(id)
        try {
            await deleteUser(id)
        } catch (error) {
            alert('Failed to delete user')
        } finally {
            setIsDeleting(null)
        }
    }

    const getRoleBadgeClasses = (role: string) => {
        if (['ADMIN', 'HRD'].includes(role)) {
            return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
        }
        if (role === 'TEKNISI') {
            return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
        }
        if (role === 'ADMINISTRASI') {
            return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
        }
        return 'bg-teal-500/10 text-teal-500 border-teal-500/20'
    }

    const getRoleIconClasses = (role: string) => {
        if (['ADMIN', 'HRD'].includes(role)) return 'text-purple-600'
        if (role === 'TEKNISI') return 'text-orange-600'
        if (role === 'ADMINISTRASI') return 'text-blue-600'
        return 'text-teal-600'
    }

    return (
        <div className="space-y-6">
            <TableWrapper>
                <TableHeaderContent
                    title="User Management"
                    description={
                        <div className="space-y-2">
                            <p>Manage users, roles, and departments.</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                                {Object.entries(
                                    users.reduce((acc, u) => {
                                        acc[u.role] = (acc[u.role] || 0) + 1;
                                        return acc;
                                    }, {} as Record<string, number>)
                                ).map(([role, count]) => (
                                    <div key={role} className="flex items-center gap-1">
                                        <span className={cn(
                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                            (role as string) === 'ADMIN' ? "bg-purple-500" :
                                                (role as string) === 'HRD' ? "bg-indigo-500" :
                                                    (role as string) === 'TEKNISI' ? "bg-orange-500" :
                                                        (role as string) === 'ADMINISTRASI' ? "bg-blue-500" : "bg-teal-500"
                                        )} />
                                        <span>{role as string}: <b>{count as number}</b></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    }
                    icon={<Shield className="w-5 h-5 font-bold text-primary" />}
                    actions={
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                                />
                            </div>
                            <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide w-full sm:w-auto">
                                <button
                                    onClick={handleAdd}
                                    className="px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    <UserPlus className="w-5 h-5" />
                                    <span className="hidden sm:inline">Add User</span>
                                    <span className="sm:hidden">Add</span>
                                </button>
                            </div>
                        </div>
                    }
                />

                {/* Mobile View */}
                <div className="md:hidden space-y-4 p-4">
                    {filteredUsers.map((user) => (
                        <div key={user.id} className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full bg-white border border-gray-300 dark:border-gray-600 ${getRoleIconClasses(user.role)}`}>
                                        {['ADMIN', 'HRD'].includes(user.role) ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground text-base">{user.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">@{user.username}</p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleBadgeClasses(user.role)}`}>
                                    {user.role}
                                </span>
                            </div>

                            <div className="text-sm text-muted-foreground space-y-1 pl-[3.5rem]">
                                <p className="truncate">{user.email}</p>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs font-medium uppercase tracking-wider">
                                        {user.department || 'No Dept'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-border mt-2">
                                <button
                                    onClick={() => handleEdit(user)}
                                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(user.id)}
                                    disabled={isDeleting === user.id}
                                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isDeleting === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredUsers.length === 0 && (
                        <div className="py-12 text-center text-muted-foreground">
                            No users found matches your search.
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <TableScrollArea>
                        <Table>
                            <TableHeader>
                                <TableRow hoverable={false} className="bg-muted/30 border-b border-border">
                                    <TableHead className="px-6 font-semibold">User</TableHead>
                                    <TableHead className="px-6 font-semibold">Role</TableHead>
                                    <TableHead className="px-6 font-semibold">Department</TableHead>
                                    <TableHead className="px-6 font-semibold" align="right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableEmpty
                                        colSpan={4}
                                        message="No users found matches your search."
                                        icon={<UserIcon className="w-12 h-12 opacity-20" />}
                                    />
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id} className="group">
                                            <TableCell className="px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full bg-white border border-gray-300 dark:border-gray-600 ${getRoleIconClasses(user.role)}`}>
                                                        {['ADMIN', 'HRD'].includes(user.role) ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground">{user.name}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">@{user.username}</p>
                                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClasses(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {user.department || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6" align="right">
                                                <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        disabled={isDeleting === user.id}
                                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        {isDeleting === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableScrollArea>
                </div>
            </TableWrapper>

            <UserDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                user={editingUser}
            />
        </div>
    )
}
