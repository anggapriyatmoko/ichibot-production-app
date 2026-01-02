'use client'

import { useState } from 'react'
import { processBatchCheckout } from '@/app/actions/checkout'
import { Search, ShoppingCart, Minus, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

type Product = {
    id: string
    name: string
    stock: number
    sku: string
    image: string | null
}

type CartItem = Product & {
    quantity: number
}

export default function POSSystem({ products }: { products: Product[] }) {
    const [cart, setCart] = useState<CartItem[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const addToCart = (product: Product) => {
        const existing = cart.find(item => item.id === product.id)
        if (existing) {
            if (existing.quantity >= product.stock) {
                // Max stock reached
                return
            }
            setCart(cart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ))
        } else {
            setCart([...cart, { ...product, quantity: 1 }])
        }
    }

    const updateQuantity = (productId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.id === productId) {
                const newQuantity = item.quantity + delta
                // Validate constraints
                if (newQuantity <= 0) return item // Handle removal separately or prevent going to 0
                if (newQuantity > item.stock) return item
                return { ...item, quantity: newQuantity }
            }
            return item
        }))
    }

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.id !== productId))
    }

    const handleCheckout = async () => {
        setLoading(true)
        setMessage(null)
        try {
            await processBatchCheckout(cart.map(item => ({ productId: item.id, quantity: item.quantity })))
            setCart([])
            setMessage({ type: 'success', text: 'Order processed successfully!' })
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Checkout failed' })
        } finally {
            setLoading(false)
        }
    }

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] gap-6">
            {/* Left: Product Grid */}
            <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border flex gap-4 bg-muted/30">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search materials..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground outline-none focus:border-primary transition-all font-medium shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-background/50">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <button
                                key={product.id}
                                disabled={product.stock === 0}
                                onClick={() => addToCart(product)}
                                className={cn(
                                    "flex flex-col text-left bg-card border border-border rounded-xl p-3 hover:bg-accent hover:border-primary/50 transition-all group relative overflow-hidden shadow-sm",
                                    product.stock === 0 && "opacity-50 cursor-not-allowed bg-muted"
                                )}
                            >
                                <div className="aspect-square w-full rounded-lg bg-muted mb-3 overflow-hidden relative">
                                    {product.image ? (
                                        <Image src={product.image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                            <div className="text-4xl font-bold opacity-20">{product.name.charAt(0)}</div>
                                        </div>
                                    )}
                                    {product.stock === 0 && (
                                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
                                            <span className="text-white font-bold text-sm bg-destructive/90 px-2 py-1 rounded">Out of Stock</span>
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-semibold text-foreground text-sm truncate w-full">{product.name}</h3>
                                <div className="flex justify-between items-center mt-1 w-full text-xs">
                                    <span className="text-muted-foreground">{product.sku}</span>
                                    <span className={cn("font-bold", product.stock <= 5 ? "text-red-500" : "text-emerald-500")}>
                                        {product.stock} Left
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Cart */}
            <div className="w-full lg:w-96 flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-lg h-full">
                <div className="p-4 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        Current Order
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <ShoppingCart className="w-12 h-12 mb-3" />
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="bg-card border border-border p-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-right-4 fade-in duration-200 shadow-sm">
                                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden relative shrink-0">
                                    {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-foreground truncate">{item.name}</h4>
                                    <p className="text-xs text-muted-foreground">Stock: {item.stock}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                                    <button
                                        onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id)}
                                        className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-destructive" /> : <Minus className="w-3.5 h-3.5" />}
                                    </button>
                                    <span className="text-sm font-bold w-4 text-center text-foreground">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.id, 1)}
                                        disabled={item.quantity >= item.stock}
                                        className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-border bg-muted/30 space-y-4">
                    {message && (
                        <div className={cn("text-xs p-2 rounded text-center font-medium", message.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400')}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-between items-center text-muted-foreground text-sm">
                        <span>Total Items</span>
                        <span className="text-foreground font-bold">{totalItems}</span>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={loading || cart.length === 0}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Complete Checkout'}
                    </button>
                </div>
            </div>
        </div>
    )
}
