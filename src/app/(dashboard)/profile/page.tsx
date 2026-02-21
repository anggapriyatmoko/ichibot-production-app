'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile, updatePin, getMyPinStatus } from '@/app/actions/profile'
import { useSession } from 'next-auth/react'
import { User, Lock, Key, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function ProfilePage() {
    const { data: session, update } = useSession()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Form inputs handled via native FormData, but we need state for password confirmation check
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // PIN state
    const [hasPin, setHasPin] = useState(false)
    const [pinCurrentPassword, setPinCurrentPassword] = useState('')
    const [newPin, setNewPin] = useState('')
    const [confirmPin, setConfirmPin] = useState('')
    const [pinError, setPinError] = useState<string | null>(null)
    const [pinSuccess, setPinSuccess] = useState<string | null>(null)
    const [pinPending, setPinPending] = useState(false)

    useEffect(() => {
        getMyPinStatus().then(res => setHasPin(res.hasPin))
    }, [])

    async function handleSubmit(formData: FormData) {
        setError(null)
        setSuccess(null)

        const name = formData.get('name') as string | null
        const currentPassword = formData.get('currentPassword') as string
        const newPass = formData.get('newPassword') as string

        // Only validate name if it's provided (for ADMIN users)
        if (name !== null && !name.trim()) {
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
                // Only update session name if name was provided (for ADMIN users)
                if (name !== null) {
                    await update({ name }) // Update client-side session with new name
                }
                setSuccess('Profile updated successfully')
                setNewPassword('')
                setConfirmPassword('')
                const form = document.querySelector('form') as HTMLFormElement
                if (form) {
                    const inputs = form.querySelectorAll('input[type="password"]')
                    inputs.forEach((input: any) => input.value = '')
                }
                router.refresh()
            } catch (e: any) {
                setError(e.message)
            }
        })
    }

    async function handlePinSubmit(e: React.FormEvent) {
        e.preventDefault()
        setPinError(null)
        setPinSuccess(null)

        if (!pinCurrentPassword) {
            setPinError('Masukkan password untuk verifikasi')
            return
        }

        if (!/^\d{4,6}$/.test(newPin)) {
            setPinError('PIN harus 4-6 digit angka')
            return
        }

        if (newPin !== confirmPin) {
            setPinError('PIN tidak cocok')
            return
        }

        setPinPending(true)
        try {
            const result = await updatePin(pinCurrentPassword, newPin)
            if (result.success) {
                setPinSuccess(hasPin ? 'PIN berhasil diubah' : 'PIN berhasil diatur')
                setHasPin(true)
                setPinCurrentPassword('')
                setNewPin('')
                setConfirmPin('')
            } else {
                setPinError(result.error || 'Gagal menyimpan PIN')
            }
        } catch (e: any) {
            setPinError(e.message)
        } finally {
            setPinPending(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
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
                            <h3>Password</h3>
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

            {/* PIN Section */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <form onSubmit={handlePinSubmit} className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold border-b border-border pb-2">
                        <Key className="w-5 h-5 text-primary" />
                        <h3>PIN Login</h3>
                        {hasPin && (
                            <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full">
                                PIN Aktif
                            </span>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {hasPin
                            ? 'Anda dapat mengubah PIN login Anda. Masukkan password untuk verifikasi.'
                            : 'Atur PIN untuk login cepat sebagai alternatif password. PIN terdiri dari 4-6 digit angka.'}
                    </p>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-foreground">Password (untuk verifikasi)</label>
                        <input
                            type="password"
                            value={pinCurrentPassword}
                            onChange={(e) => setPinCurrentPassword(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            placeholder="Masukkan password Anda"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-foreground">{hasPin ? 'PIN Baru' : 'PIN'}</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                                className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                placeholder="4-6 digit"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-foreground">Konfirmasi PIN</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                placeholder="Ulangi PIN"
                            />
                        </div>
                    </div>

                    {/* PIN Messages */}
                    {pinError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            {pinError}
                        </div>
                    )}
                    {pinSuccess && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            {pinSuccess}
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={pinPending}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-6 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {pinPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Key className="w-4 h-4" />
                                    {hasPin ? 'Ubah PIN' : 'Atur PIN'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
