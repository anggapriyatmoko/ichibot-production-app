'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/app/actions/profile'
import { useSession } from 'next-auth/react'
import { User, Lock, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function ProfilePage() {
    const { data: session, update } = useSession()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Form inputs handled via native FormData, but we need state for password confirmation check
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    async function handleSubmit(formData: FormData) {
        setError(null)
        setSuccess(null)

        const name = formData.get('name') as string
        const currentPassword = formData.get('currentPassword') as string
        const newPass = formData.get('newPassword') as string

        if (!name.trim()) {
            setError('Name cannot be empty')
            return
        }

        if (newPass) {
            if (newPass !== confirmPassword) {
                setError('New passwords do not match')
                return
            }
            if (!currentPassword) {
                setError('Please enter your current password to change it')
                return
            }
            if (newPass.length < 6) {
                setError('Password must be at least 6 characters')
                return
            }
        }

        startTransition(async () => {
            try {
                await updateProfile(formData)
                await update({ name }) // Update client-side session with new name
                setSuccess('Profile updated successfully')
                setNewPassword('')
                setConfirmPassword('')
                // Clear password fields in the form directly if needed, but they are uncontrolled mostly
                // We'll rely on the reset of state variables if they controlled value, 
                // but here for FormData inputs, we might want to reset the form.
                const form = document.querySelector('form') as HTMLFormElement
                if (form) {
                    // Reset password fields only
                    const inputs = form.querySelectorAll('input[type="password"]')
                    inputs.forEach((input: any) => input.value = '')
                }
                router.refresh()
            } catch (e: any) {
                setError(e.message)
            }
        })
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Your Profile</h1>
                <p className="text-muted-foreground">Manage your account settings and preferences.</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <form action={handleSubmit} className="space-y-6">
                    {/* Name Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold border-b border-border pb-2">
                            <User className="w-5 h-5 text-primary" />
                            <h3>Personal Information</h3>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-foreground">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                defaultValue={session?.user?.name || ''}
                                disabled={session?.user?.role !== 'ADMIN'}
                                className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none disabled:opacity-50 disabled:bg-muted"
                                placeholder="Enter your name"
                            />
                            {session?.user?.role !== 'ADMIN' && (
                                <p className="text-xs text-muted-foreground mt-1">Contact administrator to change display name.</p>
                            )}
                        </div>
                    </div>

                    {/* Password Section */}
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2 text-lg font-semibold border-b border-border pb-2">
                            <Lock className="w-5 h-5 text-primary" />
                            <h3>Security</h3>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-foreground">Current Password</label>
                            <input
                                type="password"
                                name="currentPassword"
                                className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                placeholder="Required only if changing password"
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-foreground">New Password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    placeholder="Leave blank to keep current"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    placeholder="Re-enter new password"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            {success}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-6 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
