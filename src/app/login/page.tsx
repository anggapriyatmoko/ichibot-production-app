'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Lock, Key, Delete, X } from 'lucide-react'

function LoginContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [pin, setPin] = useState('')
    const [authType, setAuthType] = useState<'password' | 'pin'>('password')
    const [hasError, setHasError] = useState(false)
    const [sessionExpired, setSessionExpired] = useState(false)

    useEffect(() => {
        if (searchParams.get('expired') === 'true') {
            setSessionExpired(true)
        }
    }, [searchParams])

    // Auto-submit when PIN reaches 6 digits
    useEffect(() => {
        if (authType === 'pin' && pin.length === 6 && email) {
            handlePinSubmit()
        }
    }, [pin])

    // Listen for keyboard input when in PIN mode
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (authType !== 'pin') return

            // Handle number keys (0-9)
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault()
                if (pin.length < 6) {
                    setPin(pin + e.key)
                    setHasError(false)
                    setError('')
                }
            }

            // Handle Backspace
            if (e.key === 'Backspace') {
                e.preventDefault()
                setPin(pin.slice(0, -1))
                setHasError(false)
                setError('')
            }
        }

        window.addEventListener('keydown', handleKeyPress)
        return () => window.removeEventListener('keydown', handleKeyPress)
    }, [authType, pin])

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (authType === 'pin') {
            handlePinSubmit()
            return
        }

        setLoading(true)
        setError('')
        setSessionExpired(false)

        try {
            const res = await signIn('credentials', {
                email,
                password,
                authType: 'password',
                redirect: false
            })

            if (res?.error) {
                setError(res.error)
                setLoading(false)
            } else {
                router.push('/dashboard')
                router.refresh()
            }
        } catch (error) {
            setError('Something went wrong')
            setLoading(false)
        }
    }

    const handlePinSubmit = async () => {
        if (pin.length < 4) return

        setLoading(true)
        setError('')
        setHasError(false)
        setSessionExpired(false)

        try {
            const res = await signIn('credentials', {
                email: '', // Not used for PIN login
                password: pin,
                authType: 'pin',
                redirect: false
            })

            if (res?.error) {
                setError(res.error)
                setHasError(true)
                setTimeout(() => {
                    setPin('')
                    setHasError(false)
                }, 2000)
            } else {
                router.push('/dashboard')
                router.refresh()
            }
        } catch (err) {
            setError('Something went wrong')
            setHasError(true)
        } finally {
            setLoading(false)
        }
    }

    const handleDigitPress = (digit: string) => {
        if (pin.length < 6) {
            setPin(pin + digit)
            setHasError(false)
            setError('')
        }
    }

    const handleRemoveDigit = () => {
        setPin(pin.slice(0, -1))
        setHasError(false)
        setError('')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
                        Ichibot Production
                    </h1>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        Welcome back
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        Sign in to your account to manage inventory
                    </p>
                </div>

                <div className="bg-card border border-border px-6 md:px-8 py-8 md:py-10 rounded-2xl shadow-xl">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {sessionExpired && (
                            <div className="p-3 text-sm text-amber-600 bg-amber-100/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Sesi Anda telah berakhir. Silakan login kembali.
                            </div>
                        )}

                        {error && authType === 'password' && (
                            <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        {/* Auth Type Toggle */}
                        <div className="flex gap-2 p-1 bg-muted rounded-lg">
                            <button
                                type="button"
                                onClick={() => { setAuthType('password'); setPin(''); setError(''); setHasError(false); }}
                                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${authType === 'password'
                                    ? 'bg-primary text-primary-foreground shadow-lg'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Lock className="w-4 h-4" />
                                Password
                            </button>
                            <button
                                type="button"
                                onClick={() => { setAuthType('pin'); setPassword(''); setError(''); setHasError(false); }}
                                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${authType === 'pin'
                                    ? 'bg-primary text-primary-foreground shadow-lg'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Key className="w-4 h-4" />
                                PIN
                            </button>
                        </div>

                        {authType === 'password' && (
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                                    Email address
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground shadow-sm focus:border-primary focus:ring-primary sm:text-sm outline-none transition-all"
                                        placeholder="user@ichibot.id"
                                    />
                                </div>
                            </div>
                        )}

                        {authType === 'password' ? (
                            <>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-foreground">
                                        Password
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground shadow-sm focus:border-primary focus:ring-primary sm:text-sm outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin h-5 w-5" />
                                    ) : (
                                        'Sign in'
                                    )}
                                </button>
                            </>
                        ) : (
                            <div className="space-y-4">
                                {/* PIN Code Boxes - Same style as HRD Dashboard */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                                        KODE PIN
                                    </label>

                                    <div className="flex gap-2 justify-center">
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                            <div
                                                key={index}
                                                className={`w-10 h-12 md:w-12 md:h-14 flex items-center justify-center border-2 rounded-lg transition-all ${hasError
                                                    ? 'border-red-500'
                                                    : index < pin.length
                                                        ? 'border-primary'
                                                        : 'border-border'
                                                    }`}
                                            >
                                                <div className={`w-3 h-3 rounded-full transition-colors ${index < pin.length
                                                    ? 'bg-foreground'
                                                    : 'bg-muted-foreground/30'
                                                    }`} />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between px-2">
                                        <p className="text-xs text-muted-foreground">
                                            {pin.length}/6 digit
                                        </p>
                                        {hasError && (
                                            <p className="text-xs text-red-500 font-semibold flex items-center gap-1 animate-in fade-in slide-in-from-right">
                                                <X className="w-3 h-3" />
                                                PIN Salah
                                            </p>
                                        )}
                                        {pin.length === 6 && !hasError && loading && (
                                            <p className="text-xs text-primary flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                Memvalidasi...
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Numpad - Same style as HRD Dashboard */}
                                <div className="grid grid-cols-3 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => handleDigitPress(num.toString())}
                                            className="py-3 md:py-4 bg-muted hover:bg-muted/80 active:bg-primary/20 rounded-lg text-xl font-bold text-foreground transition-all touch-manipulation"
                                            disabled={pin.length >= 6 || loading}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <div />
                                    <button
                                        type="button"
                                        onClick={() => handleDigitPress('0')}
                                        className="py-3 md:py-4 bg-muted hover:bg-muted/80 active:bg-primary/20 rounded-lg text-xl font-bold text-foreground transition-all touch-manipulation"
                                        disabled={pin.length >= 6 || loading}
                                    >
                                        0
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRemoveDigit}
                                        className="py-3 md:py-4 bg-muted hover:bg-muted/80 active:bg-red-500/20 rounded-lg flex items-center justify-center transition-all touch-manipulation"
                                        disabled={pin.length === 0 || loading}
                                    >
                                        <Delete className="w-5 h-5" />
                                    </button>
                                </div>

                                <p className="text-xs text-center text-muted-foreground hidden md:block">
                                    💡 Desktop: Klik keypad atau ketik langsung dengan keyboard
                                </p>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}

function LoginLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
                        Ichibot Production
                    </h1>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        Welcome back
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        Sign in to your account to manage inventory
                    </p>
                </div>
                <div className="bg-card border border-border px-6 md:px-8 py-8 md:py-10 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin h-8 w-8 text-primary" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginLoading />}>
            <LoginContent />
        </Suspense>
    )
}
