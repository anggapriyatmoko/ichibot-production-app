'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Eye, EyeOff } from 'lucide-react'
import { createUser, updateUser } from '@/app/actions/user'

interface UserDialogProps {
    isOpen: boolean
    onClose: () => void
    user?: any // If provided, we are editing
}

export default function UserDialog({ isOpen, onClose, user }: UserDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        department: '',
        role: 'USER'
    })

    // Reset or populate form on open/change
    useEffect(() => {
        if (isOpen) {
            setError('')
            if (user) {
                setFormData({
                    name: user.name || '',
                    username: user.username || '',
                    email: user.email || '',
                    password: '', // Password empty on edit unless changing
                    department: user.department || '',
                    role: user.role || 'USER'
                })
            } else {
                setFormData({
                    name: '',
                    username: '',
                    email: '',
                    password: '',
                    department: '',
                    role: 'USER'
                })
            }
        }
    }, [isOpen, user])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            if (user) {
                await updateUser(user.id, formData)
            } else {
                if (!formData.password) {
                    throw new Error('Password is required for new users')
                }
                await createUser(formData)
            }
            onClose()
        } catch (err: any) {
            setError(err.message || 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-lg flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20 rounded-t-2xl">
                    <h2 className="text-xl font-bold font-foreground">
                        {user ? 'Edit User' : 'Add New User'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
                    {error && (
                        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="John Doe"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Username</label>
                            <input
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                placeholder="username"
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                            >
                                <option value="USER">User</option>
                                <option value="TEKNISI">Teknisi</option>
                                <option value="HRD">HRD</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="user@ichibot.id"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Department</label>
                        <input
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            placeholder="Engineering"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                            {user ? 'Reset Password (optional)' : 'Password'}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required={!user}
                                placeholder={user ? "Leave blank to keep current" : ""}
                                minLength={6}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {user ? 'Save Changes' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
