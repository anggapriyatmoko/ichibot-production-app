'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false
            })

            if (res?.error) {
                setError('Invalid credentials')
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
                        StockManager
                    </h1>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        Welcome back
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        Sign in to your account to manage inventory
                    </p>
                </div>

                <div className="bg-card border border-border px-8 py-10 rounded-2xl shadow-xl">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                                {error}
                            </div>
                        )}

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
                                    className="block w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground shadow-sm focus:border-primary focus:ring-primary sm:text-sm outline-none transition-all"
                                    placeholder="admin@example.com"
                                />
                            </div>
                        </div>

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
                    </form>
                </div>
            </div>
        </div>
    )
}
