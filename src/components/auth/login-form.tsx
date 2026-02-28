'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Key, Delete, X, Timer } from 'lucide-react'

const LOCKOUT_KEYWORD = 'Terlalu banyak percobaan'

export default function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [sessionExpired, setSessionExpired] = useState(false)
    const [authType, setAuthType] = useState<'password' | 'pin'>('password')
    const [hasError, setHasError] = useState(false)
    const [isLockedOut, setIsLockedOut] = useState(false)
    const [lockoutRemaining, setLockoutRemaining] = useState(0)
    const lockoutTimerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (searchParams.get('expired') === 'true') {
            setSessionExpired(true)
        }
    }, [searchParams])

    // Start lockout countdown
    const startLockoutTimer = useCallback((minutes: number) => {
        if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current)
        const totalSeconds = minutes * 60
        setIsLockedOut(true)
        setLockoutRemaining(totalSeconds)
        setError(LOCKOUT_KEYWORD)

        lockoutTimerRef.current = setInterval(() => {
            setLockoutRemaining(prev => {
                if (prev <= 1) {
                    if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current)
                    setIsLockedOut(false)
                    setError('')
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [])

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current)
        }
    }, [])

    // Helper to check if error is a rate limit error and trigger lockout
    const handleErrorResponse = useCallback((errorMsg: string) => {
        if (errorMsg.includes(LOCKOUT_KEYWORD)) {
            const match = errorMsg.match(/(\d+)\s*menit/)
            const minutes = match ? parseInt(match[1]) : 5
            startLockoutTimer(minutes)
            return true
        }
        return false
    }, [startLockoutTimer])

    // Auto-submit when PIN reaches 6 digits
    useEffect(() => {
        if (authType === 'pin' && pin.length === 6 && email && !isLockedOut) {
            handlePinSubmit()
        }
    }, [pin])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (authType === 'pin') {
            handlePinSubmit()
            return
        }

        if (isLockedOut) return
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
                if (!handleErrorResponse(res.error)) {
                    setError(res.error)
                }
            } else {
                router.push('/inventory')
                router.refresh()
            }
        } catch (err) {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const handlePinSubmit = async () => {
        if (!email || pin.length < 4 || isLockedOut) return

        setLoading(true)
        setError('')
        setHasError(false)
        setSessionExpired(false)

        try {
            const res = await signIn('credentials', {
                email,
                password: pin,
                authType: 'pin',
                redirect: false
            })

            if (res?.error) {
                if (handleErrorResponse(res.error)) {
                    // Rate limited — lockout is active, clear PIN
                    setPin('')
                    setHasError(false)
                } else {
                    setError(res.error)
                    setHasError(true)
                    setTimeout(() => {
                        setPin('')
                        setHasError(false)
                    }, 2000)
                }
            } else {
                router.push('/inventory')
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
        if (pin.length < 6 && !isLockedOut) {
            setPin(pin + digit)
            setHasError(false)
            if (!isLockedOut) setError('')
        }
    }

    const handleRemoveDigit = () => {
        if (isLockedOut) return
        setPin(pin.slice(0, -1))
        setHasError(false)
        if (!isLockedOut) setError('')
    }

    const formatCountdown = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {sessionExpired && (
                <div className="p-3 text-sm text-amber-600 bg-amber-100/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Sesi Anda telah berakhir. Silakan login kembali.
                </div>
            )}
            {isLockedOut && (
                <div className="p-3 text-sm rounded-lg text-amber-500 bg-amber-100/10 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 flex-shrink-0 animate-pulse" />
                        <div>
                            <p className="font-medium">Terlalu banyak percobaan.</p>
                            <p className="text-xs mt-0.5 opacity-80">Tunggu {formatCountdown(lockoutRemaining)} untuk mencoba lagi.</p>
                        </div>
                    </div>
                </div>
            )}
            {error && !isLockedOut && (
                <div className="p-3 text-sm text-red-500 bg-red-100/10 border border-red-500/20 rounded-lg">
                    {error}
                </div>
            )}

            {/* Auth Type Toggle */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
                <button
                    type="button"
                    onClick={() => { setAuthType('password'); setPin(''); if (!isLockedOut) { setError(''); } setHasError(false); }}
                    disabled={isLockedOut}
                    className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${authType === 'password'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                        } ${isLockedOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Lock className="w-4 h-4" />
                    Password
                </button>
                <button
                    type="button"
                    onClick={() => { setAuthType('pin'); setPassword(''); if (!isLockedOut) { setError(''); } setHasError(false); }}
                    disabled={isLockedOut}
                    className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${authType === 'pin'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                        } ${isLockedOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Key className="w-4 h-4" />
                    PIN
                </button>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-gray-500 transition-all font-light ${isLockedOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="user@ichibot.id"
                    required
                    disabled={isLockedOut}
                />
            </div>

            {authType === 'password' ? (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-gray-500 transition-all font-light ${isLockedOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder="••••••••"
                            required
                            disabled={isLockedOut}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || isLockedOut}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Signing in...
                            </span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </>
            ) : (
                <div className="space-y-4">
                    {/* PIN Code Boxes */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-gray-400 ml-1">
                            KODE PIN
                        </label>

                        <div className="flex gap-2 justify-center">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                                <div
                                    key={index}
                                    className={`w-10 h-12 md:w-12 md:h-14 flex items-center justify-center border-2 rounded-lg transition-all ${isLockedOut
                                        ? 'border-white/10 opacity-50'
                                        : hasError
                                            ? 'border-red-500'
                                            : index < pin.length
                                                ? 'border-blue-500'
                                                : 'border-white/20'
                                        }`}
                                >
                                    <div className={`w-3 h-3 rounded-full transition-colors ${index < pin.length
                                        ? 'bg-white'
                                        : 'bg-white/30'
                                        }`} />
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between px-2">
                            <p className="text-xs text-gray-500">
                                {pin.length}/6 digit
                            </p>
                            {hasError && (
                                <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                                    <X className="w-3 h-3" />
                                    PIN Salah
                                </p>
                            )}
                            {pin.length === 6 && !hasError && loading && (
                                <p className="text-xs text-blue-400 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    Memvalidasi...
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                type="button"
                                onClick={() => handleDigitPress(num.toString())}
                                className={`py-4 rounded-lg text-xl font-bold text-white transition-all touch-manipulation ${isLockedOut ? 'bg-white/5 opacity-50 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 active:bg-blue-500/30'}`}
                                disabled={pin.length >= 6 || loading || isLockedOut}
                            >
                                {num}
                            </button>
                        ))}
                        <div />
                        <button
                            type="button"
                            onClick={() => handleDigitPress('0')}
                            className={`py-4 rounded-lg text-xl font-bold text-white transition-all touch-manipulation ${isLockedOut ? 'bg-white/5 opacity-50 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 active:bg-blue-500/30'}`}
                            disabled={pin.length >= 6 || loading || isLockedOut}
                        >
                            0
                        </button>
                        <button
                            type="button"
                            onClick={handleRemoveDigit}
                            className={`py-4 rounded-lg flex items-center justify-center transition-all touch-manipulation ${isLockedOut ? 'bg-white/5 opacity-50 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 active:bg-red-500/30'}`}
                            disabled={pin.length === 0 || loading || isLockedOut}
                        >
                            <Delete className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    <p className="text-xs text-center text-gray-500 hidden md:block">
                        💡 Ketik langsung dengan keyboard atau klik numpad
                    </p>
                </div>
            )}

            <div className="text-center text-xs text-gray-400 mt-4">

            </div>
        </form>
    )
}
