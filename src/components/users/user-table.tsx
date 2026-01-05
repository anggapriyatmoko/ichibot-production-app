'use client'

import { useState } from 'react'
import { Edit2, Trash2, Search, UserPlus, Shield, User as UserIcon } from 'lucide-react'
import { deleteUser } from '@/app/actions/user'
import UserDialog from './user-dialog'

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

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    />
                </div>
                <button
                    onClick={handleAdd}
                    className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    Add User
                </button>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
                {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full bg-white border border-gray-300 dark:border-gray-600 ${user.role === 'ADMIN' ? 'text-purple-600' : 'text-teal-600'}`}>
                                    {user.role === 'ADMIN' ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-bold text-foreground text-base">{user.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">@{user.username}</p>
                                </div>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${user.role === 'ADMIN'
                                ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                                : 'bg-teal-500/10 text-teal-600 border-teal-500/20'
                                }`}>
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
                    <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground text-sm">
                        No users found matches your search.
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border text-left">
                                <th className="px-6 py-4 font-semibold text-sm text-muted-foreground uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 font-semibold text-sm text-muted-foreground uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 font-semibold text-sm text-muted-foreground uppercase tracking-wider">Department</th>
                                <th className="px-6 py-4 font-semibold text-sm text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-accent/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full bg-white border border-gray-300 dark:border-gray-600 ${user.role === 'ADMIN' ? 'text-purple-600' : 'text-teal-600'}`}>
                                                {user.role === 'ADMIN' ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">{user.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">@{user.username}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${user.role === 'ADMIN'
                                            ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                            : 'bg-teal-500/10 text-teal-500 border-teal-500/20'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            {user.department || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
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
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                        No users found matches your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <UserDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                user={editingUser}
            />
        </div>
    )
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}
