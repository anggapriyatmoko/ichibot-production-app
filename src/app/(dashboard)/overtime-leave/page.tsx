'use client'

import { useState } from 'react'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { verifyUserPassword } from '@/app/actions/profile'

export default function OvertimeLeavePage() {
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const result = await verifyUserPassword(password)

            if (result.success) {
                setIsUnlocked(true)
            } else {
                setError(result.error || 'Password salah')
            }
        } catch (err) {
            setError('Terjadi kesalahan')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isUnlocked) {
        return (
            <div className="max-w-md mx-auto mt-20">
                <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-border bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-full bg-amber-500/10">
                                <Lock className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">Izin / Lembur</h1>
                                <p className="text-sm text-muted-foreground">Masukkan password akun Anda untuk mengakses</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                Password Akun
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Masukkan password akun Anda"
                                    autoComplete="new-password"
                                    className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-red-500 font-medium">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !password}
                            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Memverifikasi...
                                </>
                            ) : (
                                'Buka Halaman'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    // Unlocked - Show the actual content (empty for now)
    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-right md:text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Izin / Lembur</h1>
                <p className="text-muted-foreground">Kelola data izin dan lembur karyawan.</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-12 text-center">
                <p className="text-muted-foreground">
                    Halaman ini masih dalam pengembangan.
                </p>
            </div>
        </div>
    )
}
