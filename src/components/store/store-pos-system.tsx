'use client'

import { Search, ShoppingCart, Minus, Plus, Trash2, Package, Eye, X, ChevronLeft, ChevronRight, User, Check, Edit2, Home, Store, Clock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber } from '@/utils/format'
import Image from 'next/image'
import { useState, useCallback, useEffect, useRef } from 'react'
import { searchWooCommerceProducts, getProductVariations } from '@/app/actions/store-product'
import { useAlert } from '@/hooks/use-alert'
import { useConfirmation } from '@/components/providers/modal-provider'
import { createWooCommerceOrder } from '@/app/actions/store-order'
import CheckoutReceipt from '@/components/store/checkout-receipt'
import POSOrderHistory from '@/components/store/pos-order-history'
import { Loader2, History, List } from 'lucide-react'

type WooCommerceProduct = {
    id: number
    name: string
    sku: string
    type: string
    attributes: any[]
    price: number
    regularPrice: number
    salePrice: number
    stockQuantity: number
    image: string | null
    images: string[]
    description: string
    barcode: string | null
    slug: string
    parentId?: number
}

type CartItem = WooCommerceProduct & {
    quantity: number
}

export default function StorePOSSystem({ userName = 'Admin' }: { userName?: string }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedTerm, setDebouncedTerm] = useState('')
    const [products, setProducts] = useState<WooCommerceProduct[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [totalItems, setTotalItems] = useState(0)
    const [cart, setCart] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(false)
    const [isCheckingOut, setIsCheckingOut] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [customerName, setCustomerName] = useState('Guest')
    const [isEditingCustomer, setIsEditingCustomer] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<WooCommerceProduct | null>(null)
    const [variationPickerProduct, setVariationPickerProduct] = useState<WooCommerceProduct | null>(null)
    const [variations, setVariations] = useState<WooCommerceProduct[]>([])
    const [loadingVariations, setLoadingVariations] = useState(false)
    const [loadingIds, setLoadingIds] = useState<number[]>([])
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const { showError } = useAlert()
    const { showConfirmation } = useConfirmation()
    const [lastOrder, setLastOrder] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'cart' | 'orders'>('cart')

    const lastSearchedRef = useRef('')
    const lastPageRef = useRef(1)
    const isInitialMount = useRef(true)

    // Load cart from localStorage
    useEffect(() => {
        const savedCart = localStorage.getItem('pos-cart')
        const savedCustomer = localStorage.getItem('pos-customer')
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart))
            } catch (error) {
                console.error('Failed to load cart:', error)
            }
        }
        if (savedCustomer) {
            setCustomerName(savedCustomer)
        }
        isInitialMount.current = false
    }, [])

    // Save cart and customer to localStorage
    useEffect(() => {
        if (!isInitialMount.current) {
            localStorage.setItem('pos-cart', JSON.stringify(cart))
            localStorage.setItem('pos-customer', customerName)
        }
    }, [cart, customerName])

    const handleSearch = useCallback(async (query: string, pageNum: number = 1) => {
        const trimmedQuery = query.trim()
        if (!trimmedQuery) {
            setProducts([])
            setHasSearched(false)
            setPage(1)
            setTotalPages(0)
            setTotalItems(0)
            return
        }

        setLoading(true)
        try {
            const { products: results, totalPages: total, totalItems: items } = await searchWooCommerceProducts(trimmedQuery, pageNum)
            setProducts(results || [])
            setTotalPages(total)
            setTotalItems(items)
            setHasSearched(true)
        } catch (error) {
            showError('Gagal mencari produk.')
        } finally {
            setLoading(false)
        }
    }, [showError])

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // Search effect
    useEffect(() => {
        if (debouncedTerm !== lastSearchedRef.current) {
            lastSearchedRef.current = debouncedTerm
            setPage(1) // Reset page on new search
            handleSearch(debouncedTerm, 1)
        } else if (page !== lastPageRef.current) {
            lastPageRef.current = page
            handleSearch(debouncedTerm, page)
        }
    }, [debouncedTerm, page, handleSearch])


    const addToCart = (product: WooCommerceProduct) => {
        const existing = cart.find(item => item.id === product.id)
        if (existing) {
            // Move to top and increment quantity
            setCart([
                { ...existing, quantity: existing.quantity + 1 },
                ...cart.filter(item => item.id !== product.id)
            ])
        } else {
            // Add new item to top
            setCart([{ ...product, quantity: 1 }, ...cart])
        }
    }

    const updateQuantity = (id: number, delta: number) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta
                return newQty > 0 ? { ...item, quantity: newQty } : item
            }
            return item
        }))
    }

    const setQuantity = (id: number, value: number) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                // Allow intermediate 0 or smaller for flexibility while typing
                return { ...item, quantity: value }
            }
            return item
        }))
    }

    const setPrice = (id: number, value: number) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                return { ...item, price: value }
            }
            return item
        }))
    }

    const removeFromCart = (id: number) => {
        setCart(cart.filter(item => item.id !== id))
    }

    const clearCart = () => {
        showConfirmation({
            title: 'Hapus Keranjang',
            message: 'Apakah Anda yakin ingin menghapus seluruh isi keranjang?',
            confirmLabel: 'Hapus',
            cancelLabel: 'Batal',
            action: () => {
                setCart([])
            }
        })
    }

    const handleCheckout = async () => {
        if (cart.length === 0) return

        showConfirmation({
            title: 'Konfirmasi Checkout',
            message: 'Apakah Anda yakin ingin memproses pesanan ini? Stok akan otomatis berkurang.',
            confirmLabel: 'Proses Pesanan',
            cancelLabel: 'Batal',
            action: async () => {
                setIsCheckingOut(true)
                try {
                    const { success, order, error } = await createWooCommerceOrder({
                        items: cart.map(item => ({
                            product_id: item.parentId || item.id,
                            variation_id: item.parentId ? item.id : undefined,
                            quantity: item.quantity,
                            price: item.price
                        })),
                        customerNote: `POS Order by ${userName}`,
                        paymentMethod: 'bacs',
                        paymentMethodTitle: 'Transfer Bank',
                        setPaid: true,
                        cashierName: userName, // Pass cashier name
                        billing: {
                            first_name: customerName,
                            last_name: '(POS)',
                            email: 'guest@pos.ichibot.id',
                            phone: '-'
                        }
                    })

                    if (success && order) {
                        setLastOrder({
                            id: order.id,
                            number: order.number || `ORD-${order.id}`,
                            customerName: customerName,
                            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                            items: cart.map(item => ({
                                name: item.name,
                                quantity: item.quantity,
                                price: item.price,
                                total: item.price * item.quantity,
                                attributes: item.attributes,
                                sku: item.sku,
                                barcode: item.barcode
                            })),
                            total: total,
                            paymentMethod: 'Cash',
                            cashierName: userName
                        })
                        setCart([]) // Clear cart
                        setCustomerName('Guest') // Reset customer
                    } else {
                        showError(error || 'Gagal memproses pesanan')
                    }
                } catch (error) {
                    showError('Terjadi kesalahan saat checkout')
                } finally {
                    setIsCheckingOut(false)
                }
            }
        })
    }

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (selectedProduct) {
            setCurrentImageIndex((prev) => (prev + 1) % selectedProduct.images.length)
        }
    }

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (selectedProduct) {
            setCurrentImageIndex((prev) => (prev - 1 + selectedProduct.images.length) % selectedProduct.images.length)
        }
    }

    // Load variations when a variable product is selected (Detail Modal or Small Popup)
    useEffect(() => {
        const product = selectedProduct || variationPickerProduct;
        if (product && product.type === 'variable') {
            const fetchVariations = async () => {
                setLoadingVariations(true)
                try {
                    const data = await getProductVariations(product.id)
                    setVariations(data)
                } catch (error) {
                    showError('Gagal mengambil variasi produk.')
                } finally {
                    setLoadingVariations(false)
                }
            }
            fetchVariations()
        } else if (!selectedProduct && !variationPickerProduct) {
            setVariations([])
        }
    }, [selectedProduct?.id, variationPickerProduct?.id, showError])

    // Modal scroll lock
    useEffect(() => {
        if (selectedProduct || variationPickerProduct) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [selectedProduct, variationPickerProduct])

    return (
        <div className="flex-1 flex overflow-hidden min-h-0 bg-background w-full h-full relative">
            {/* Left side: Search and Results */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden h-full">
                <div className="mb-6 shrink-0 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/"
                            className="p-3 bg-card border border-border rounded-2xl text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm"
                            title="Ke Dashboard"
                        >
                            <Home className="w-6 h-6" />
                        </Link>
                        <a
                            href={process.env.NEXT_PUBLIC_WC_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-card border border-border rounded-2xl text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm"
                            title="Ke Toko"
                        >
                            <Store className="w-6 h-6" />
                        </a>
                    </div>
                    <div className="relative flex-1 max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari produk disini..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearch(searchTerm)
                                }
                            }}
                            className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl text-lg font-medium shadow-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                </div>

                {hasSearched && (
                    <div className="mb-4 shrink-0 px-1">
                        <span className="text-sm text-muted-foreground">
                            Menampilkan <span className="font-medium text-foreground">{products.length}</span> dari <span className="font-medium text-foreground">{totalItems}</span> produk
                        </span>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto min-h-0 flex flex-col relative scrollbar-gutter-stable">
                    {!hasSearched && !loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground animate-in fade-in zoom-in duration-300">
                            <Package className="w-20 h-20 mb-4 opacity-20" />
                            <p className="text-xl font-semibold text-center px-4">Silahkan cari barang yang diinginkan</p>
                        </div>
                    ) : loading ? (
                        <div className="flex-1">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-1 h-fit">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="flex flex-col bg-card border border-border shadow-sm animate-in fade-in duration-500 rounded-xl overflow-hidden">
                                        {/* Image Skeleton */}
                                        <div className="aspect-square bg-muted relative overflow-hidden rounded-t-xl">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                        </div>

                                        {/* Content Skeleton */}
                                        <div className="p-3 space-y-3">
                                            {/* Title lines */}
                                            <div className="space-y-2">
                                                <div className="h-3 w-full bg-muted rounded-full relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                                </div>
                                                <div className="h-3 w-4/5 bg-muted rounded-full relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                                </div>
                                            </div>

                                            {/* SKU/Gudang info */}
                                            <div className="space-y-1">
                                                <div className="h-2 w-1/2 bg-muted rounded-full relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                                </div>
                                                <div className="h-2 w-1/3 bg-muted rounded-full relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                                </div>
                                            </div>

                                            {/* Price and Stock */}
                                            <div className="pt-2 flex items-center justify-between">
                                                <div className="h-4 w-20 bg-muted rounded-full relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                                </div>
                                                <div className="h-5 w-12 bg-muted rounded relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <p className="text-xl font-semibold opacity-50 underline decoration-primary/30 underline-offset-8">Produk tidak ditemukan.</p>
                            <p className="text-sm mt-2">Coba kata kunci lain atau periksa koneksi internet.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-6 p-1 h-fit">
                                {products.map((product) => (
                                    <button
                                        key={product.id}
                                        onClick={() => {
                                            if (product.type === 'variable') {
                                                setVariationPickerProduct(product)
                                            } else {
                                                addToCart(product)
                                            }
                                        }}
                                        className="flex flex-col bg-card border border-border hover:border-primary hover:shadow-lg transition-all text-left animate-in fade-in slide-in-from-bottom-2 group rounded-xl overflow-hidden"
                                    >
                                        <div className="aspect-square relative bg-muted rounded-t-xl overflow-hidden">
                                            {product.image ? (
                                                <Image src={product.image} alt={product.name} fill className="object-cover" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                                    <Package className="w-12 h-12" />
                                                </div>
                                            )}

                                            {/* HABIS Label Overlay - Interactive Tiny Theme */}
                                            {product.stockQuantity <= 0 && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center p-3 bg-background/20 backdrop-blur-[1px] group-hover:backdrop-blur-none group-hover:bg-transparent transition-all duration-300">
                                                    <div className="bg-red-50 dark:bg-red-950/90 rounded-lg px-3 py-1 border border-red-100 dark:border-red-900 shadow-sm animate-in zoom-in-95 duration-200">
                                                        <span className="text-red-600 dark:text-red-400 font-bold text-xs tracking-wider">HABIS</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Eye icon for details */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedProduct(product)
                                                    setCurrentImageIndex(0)
                                                }}
                                                className="absolute top-2 right-2 z-20 p-2 bg-background/80 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white shadow-lg"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="p-3 flex-1 flex flex-col">
                                            <h3 className="font-semibold text-sm line-clamp-3 min-h-[3.75rem]">{product.name}</h3>
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                <p className="text-[12px] text-primary font-medium leading-none">SKU : {product.sku || '-'}</p>
                                                {product.barcode && (
                                                    <p className="text-[12px] text-muted-foreground leading-none">Backup : {product.barcode}</p>
                                                )}
                                            </div>
                                            <div className="mt-auto pt-2 space-y-1">
                                                {product.regularPrice > product.price && (
                                                    <div className="text-[10px] text-muted-foreground line-through leading-none">
                                                        {formatCurrency(product.regularPrice)}
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-primary font-bold">{formatCurrency(product.price)}</span>
                                                    <span className={cn(
                                                        "text-xs px-2 py-1 rounded font-bold",
                                                        product.stockQuantity <= 0
                                                            ? "bg-destructive/10 text-destructive"
                                                            : "bg-emerald-500/10 text-emerald-600"
                                                    )}>
                                                        {product.type === 'variable' ? 'Variable' : `Stok: ${product.stockQuantity}`}
                                                    </span>
                                                </div>
                                                {product.attributes && product.attributes.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {product.attributes.map((attr: any) => (
                                                            <span key={attr.name} className="px-1.5 py-0.5 rounded bg-muted text-[10px] border border-border text-muted-foreground">
                                                                <span className="font-semibold">{attr.name}:</span> {attr.option || (Array.isArray(attr.options) ? attr.options.join(', ') : '-')}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {product.type === 'variable' && (
                                                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-muted-foreground uppercase">Variable</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setVariationPickerProduct(product);
                                                            }}
                                                            className="text-xs text-primary font-black hover:bg-primary/5 px-2 py-1 rounded-lg border border-primary/20 transition-all"
                                                        >
                                                            Lihat Varian
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="mt-auto py-6 border-t border-border flex items-center justify-end shrink-0">
                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={page <= 1 || loading}
                                            onClick={() => setPage(p => p - 1)}
                                            className="px-4 py-2 border border-border rounded-xl hover:bg-muted disabled:opacity-50 transition-all font-medium"
                                        >
                                            Sebelumnya
                                        </button>
                                        <div className="flex items-center gap-1 px-4">
                                            <span className="font-bold text-primary">{page}</span>
                                            <span className="text-muted-foreground">/</span>
                                            <span className="text-muted-foreground">{totalPages}</span>
                                        </div>
                                        <button
                                            disabled={page >= totalPages || loading}
                                            onClick={() => setPage(p => p + 1)}
                                            className="px-4 py-2 border border-border rounded-xl hover:bg-muted disabled:opacity-50 transition-all font-medium"
                                        >
                                            Selanjutnya
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Right side: Basket */}
            <div className="w-96 bg-card border-l border-border flex flex-col shadow-xl z-20">
                <div className="flex flex-col border-b border-border bg-muted/10">
                    <div className="flex w-full">
                        <button
                            onClick={() => setActiveTab('cart')}
                            className={cn(
                                "flex-1 px-4 py-4 text-sm font-black transition-all flex items-center justify-center gap-2 border-b-2",
                                activeTab === 'cart'
                                    ? "bg-primary border-primary text-primary-foreground shadow-md hover:bg-primary"
                                    : "bg-muted/10 border-transparent text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            <ShoppingCart className="w-4 h-4" />
                            KERANJANG
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={cn(
                                "flex-1 px-4 py-4 text-sm font-black transition-all flex items-center justify-center gap-2 border-b-2 border-l border-border",
                                activeTab === 'orders'
                                    ? "bg-primary border-primary text-primary-foreground shadow-md hover:bg-primary"
                                    : "bg-muted/10 border-transparent text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            <History className="w-4 h-4" />
                            ORDER
                        </button>
                    </div>

                    <div className="p-4 border-t border-border/50 flex items-center justify-between">
                        <div className="space-y-0.5 mt-0.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">User: {userName}</p>
                            <div className="flex items-center gap-1.5 group/customer">
                                <User className="w-3 h-3 text-primary/70" />
                                {isEditingCustomer ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') setIsEditingCustomer(false)
                                                if (e.key === 'Escape') setIsEditingCustomer(false)
                                            }}
                                            className="text-xs font-medium bg-background border border-primary/30 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary w-24 h-5"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => setIsEditingCustomer(false)}
                                            className="p-0.5 hover:bg-emerald-100 text-emerald-600 rounded transition-colors"
                                        >
                                            <Check className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-medium text-foreground/80 truncate max-w-[120px]">
                                            {customerName}
                                        </p>
                                        <button
                                            onClick={() => setIsEditingCustomer(true)}
                                            className="p-1 hover:bg-primary/10 text-primary/50 hover:text-primary rounded opacity-0 group-hover/customer:opacity-100 transition-all"
                                            title="Ubah Customer"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {cart.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus Keranjang</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {activeTab === 'cart' ? (
                        cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 italic px-8 text-center animate-in fade-in duration-300">
                                <ShoppingCart className="w-16 h-16 mb-4" />
                                <p>Keranjang masih kosong</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.id} className="bg-background border border-border rounded-xl p-3 flex flex-col animate-in slide-in-from-right-4 fade-in relative group/item">
                                    <div className="flex gap-3">
                                        <div className="w-16 h-16 bg-muted relative shrink-0 border border-border/50">
                                            {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center pr-6">
                                            <div className="space-y-0.5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-bold text-sm line-clamp-2 leading-tight h-[2.5em]">{item.name}</h4>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                                                        title="Hapus dari keranjang"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted-foreground">SKU: {item.sku || '-'}</span>
                                                    <span className={cn(
                                                        "text-[9px] px-1.5 py-0.5 rounded font-bold",
                                                        item.stockQuantity <= 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600"
                                                    )}>
                                                        Stok: {item.stockQuantity}
                                                    </span>
                                                </div>
                                                {item.attributes && item.attributes.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {item.attributes.map((attr: any) => (
                                                            <span key={attr.name} className="px-1 py-0.5 rounded bg-muted text-[8px] border border-border">
                                                                {attr.name}: {attr.option}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <div className="relative group/price">
                                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary pointer-events-none">Rp</span>
                                                        <input
                                                            type="text"
                                                            value={item.price === 0 ? '' : formatNumber(item.price)}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                                const num = parseInt(val) || 0;
                                                                setPrice(item.id, num);
                                                            }}
                                                            onFocus={(e) => e.target.select()}
                                                            className="pl-7 pr-1 h-8 text-sm font-black bg-transparent border border-transparent focus:border-primary/20 focus:bg-background rounded-md outline-none transition-all text-primary"
                                                            style={{
                                                                width: `${(formatNumber(item.price).length || 1) + 3.5}ch`,
                                                                minWidth: '5rem'
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-0.5 bg-background border border-border rounded-lg p-[2px] transition-all">
                                                        <button
                                                            onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id)}
                                                            className="p-1 hover:bg-muted rounded-md text-primary hover:text-destructive transition-all active:scale-95"
                                                        >
                                                            {item.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5 text-destructive" /> : <Minus className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={item.quantity === 0 ? '' : item.quantity}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                                const num = parseInt(val) || 0;
                                                                setQuantity(item.id, num);
                                                            }}
                                                            onBlur={(e) => {
                                                                const val = parseInt(e.target.value.replace(/[^0-9]/g, ''));
                                                                if (isNaN(val) || val <= 0) setQuantity(item.id, 1);
                                                            }}
                                                            onFocus={(e) => e.target.select()}
                                                            className="text-center text-xs font-black bg-transparent border border-transparent rounded outline-none h-6 px-1"
                                                            style={{
                                                                width: `${(item.quantity.toString().length || 1) + 1}ch`,
                                                                minWidth: '2rem'
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => updateQuantity(item.id, 1)}
                                                            className="p-1 hover:bg-muted rounded-md text-primary transition-all active:scale-95"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {item.regularPrice > item.price && (
                                                    <span className="text-[10px] text-muted-foreground line-through ml-7 leading-none">
                                                        {formatCurrency(item.regularPrice)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-0.5">Total</div>
                                                <div className="text-sm font-black text-foreground">
                                                    {formatCurrency(item.price * item.quantity)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        <div className="h-full animate-in slide-in-from-right-4 fade-in duration-300">
                            <POSOrderHistory
                                onPrintOrder={(order: any) => {
                                    const mappedOrder = {
                                        id: order.id,
                                        number: order.number,
                                        customerName: order.billing?.first_name
                                            ? `${order.billing.first_name} ${order.billing.last_name}`.trim()
                                            : customerName,
                                        date: new Date(order.date_created).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }),
                                        items: order.line_items.map((item: any) => ({
                                            name: item.name,
                                            quantity: item.quantity,
                                            price: parseFloat(item.price),
                                            total: parseFloat(item.total),
                                            sku: item.sku,
                                            barcode: item.meta_data?.find((m: any) => m.key === 'backup_gudang')?.value,
                                            attributes: item.meta_data
                                                ?.filter((m: any) => !m.key.startsWith('_'))
                                                .map((m: any) => ({ name: m.key, option: m.value }))
                                        })),
                                        total: parseFloat(order.total),
                                        paymentMethod: order.payment_method_title || 'Cash',
                                        cashierName: order.meta_data?.find((m: any) => m.key === '_pos_cashier_name')?.value
                                    };
                                    setLastOrder(mappedOrder);
                                }}
                            />
                        </div>
                    )}
                </div>

                {activeTab === 'cart' && (
                    <div className="p-6 border-t border-border bg-muted/30 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="space-y-2">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Total Item</span>
                                <span>{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-black">
                                <span>TOTAL</span>
                                <span className="text-primary">{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || loading || isCheckingOut}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2"
                        >
                            {isCheckingOut ? 'Memproses...' : 'Checkout / Bayar'}
                        </button>
                    </div>
                )}
            </div>

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedProduct(null)}>
                    <div
                        className="bg-card border border-border rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-4 md:p-6 border-b border-border flex items-center justify-between shrink-0 bg-muted/30">
                            <h3 className="text-xl font-bold">{selectedProduct.name}</h3>
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="p-2 hover:bg-muted rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="overflow-y-auto flex-1 p-0">
                            <div className="grid grid-cols-1 md:grid-cols-2">
                                {/* Left side: Image Gallery */}
                                <div className="bg-muted/50 aspect-square relative group">
                                    {selectedProduct.images && selectedProduct.images.length > 0 ? (
                                        <>
                                            <Image
                                                src={
                                                    typeof selectedProduct.images[currentImageIndex] === 'string'
                                                        ? selectedProduct.images[currentImageIndex] as string
                                                        : (selectedProduct.images[currentImageIndex] as any)?.src || '/placeholder.png'
                                                }
                                                alt={selectedProduct.name}
                                                fill
                                                className="object-contain p-4"
                                            />

                                            {selectedProduct.images.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={prevImage}
                                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full hover:bg-primary hover:text-white transition-all shadow-md opacity-0 group-hover:opacity-100"
                                                    >
                                                        <ChevronLeft className="w-6 h-6" />
                                                    </button>
                                                    <button
                                                        onClick={nextImage}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full hover:bg-primary hover:text-white transition-all shadow-md opacity-0 group-hover:opacity-100"
                                                    >
                                                        <ChevronRight className="w-6 h-6" />
                                                    </button>

                                                    {/* Dots */}
                                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 p-2 bg-background/20 backdrop-blur rounded-full">
                                                        {selectedProduct.images.map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className={cn(
                                                                    "w-2 h-2 rounded-full transition-all",
                                                                    i === currentImageIndex ? "bg-primary w-4" : "bg-primary/30"
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full min-h-[400px]">
                                            <Package className="w-20 h-20 mb-4 opacity-20" />
                                            <p>No images available</p>
                                        </div>
                                    )}
                                </div>

                                {/* Right side: Details */}
                                <div className="p-6 md:p-8 space-y-6 flex flex-col h-full">
                                    <div>
                                        <div className="flex flex-col gap-1 mb-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SKU: {selectedProduct.sku || '-'}</span>
                                                <span className={cn(
                                                    "text-xs px-2 py-1 rounded font-bold",
                                                    selectedProduct.stockQuantity <= 0
                                                        ? "bg-destructive/10 text-destructive"
                                                        : "bg-emerald-500/10 text-emerald-600"
                                                )}>
                                                    Stok: {selectedProduct.stockQuantity}
                                                </span>
                                            </div>
                                            {selectedProduct.barcode && (
                                                <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full w-fit">
                                                    Gudang: {selectedProduct.barcode}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-3xl font-black text-primary">
                                            {formatCurrency(selectedProduct.price)}
                                        </div>
                                        {selectedProduct.regularPrice > selectedProduct.price && (
                                            <div className="text-sm text-muted-foreground line-through mt-1">
                                                {formatCurrency(selectedProduct.regularPrice)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                                        {selectedProduct.type === 'variable' ? (
                                            <>
                                                <h4 className="font-bold border-b border-border pb-2 shrink-0">Pilih Variasi</h4>
                                                <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                                                    {loadingVariations ? (
                                                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                                            <Loader2 className="w-8 h-8 animate-spin mb-2 outline-none" />
                                                            <p className="text-xs">Mengambil variasi...</p>
                                                        </div>
                                                    ) : variations.length > 0 ? (
                                                        variations.map((v) => (
                                                            <button
                                                                key={v.id}
                                                                onClick={() => {
                                                                    if (selectedProduct) {
                                                                        addToCart({ ...v, name: selectedProduct.name })
                                                                        setSelectedProduct(null)
                                                                    }
                                                                }}
                                                                className="w-full p-3 bg-muted/50 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center justify-between group/variant"
                                                            >
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {v.attributes.map((attr: any) => (
                                                                            <span key={attr.name} className="px-1.5 py-0.5 rounded bg-background text-[10px] font-bold border border-border">
                                                                                {attr.name}: {attr.option}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-tight">SKU: {v.sku || '-'} • Stok: {v.stockQuantity}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-bold text-primary group-hover/variant:scale-105 transition-transform">{formatCurrency(v.price)}</div>
                                                                    {v.regularPrice > v.price && (
                                                                        <div className="text-[10px] text-muted-foreground line-through">{formatCurrency(v.regularPrice)}</div>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <p className="text-center py-8 text-muted-foreground text-sm italic">Produk ini tidak memiliki variasi aktif.</p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <h4 className="font-bold border-b border-border pb-2">Deskripsi Produk</h4>
                                                <div
                                                    className="text-sm text-muted-foreground prose prose-sm max-w-none prose-invert overflow-y-auto max-h-[300px] scrollbar-thin"
                                                    dangerouslySetInnerHTML={{ __html: selectedProduct.description }}
                                                />
                                            </>
                                        )}
                                    </div>

                                    {selectedProduct.type !== 'variable' && (
                                        <div className="pt-6 mt-auto shrink-0">
                                            <button
                                                onClick={() => {
                                                    if (selectedProduct) {
                                                        addToCart(selectedProduct)
                                                        setSelectedProduct(null)
                                                    }
                                                }}
                                                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                                            >
                                                <ShoppingCart className="w-5 h-5" />
                                                Tambah ke Keranjang
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {lastOrder && (
                <CheckoutReceipt
                    order={lastOrder}
                    onClose={() => setLastOrder(null)}
                />
            )}

            {/* Small Variation Picker Popup */}
            {variationPickerProduct && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setVariationPickerProduct(null)}>
                    <div
                        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                            <h4 className="font-bold text-sm truncate pr-4">{variationPickerProduct.name}</h4>
                            <button onClick={() => setVariationPickerProduct(null)} className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2 scrollbar-thin">
                            {loadingVariations ? (
                                <div className="flex flex-col items-center justify-center p-8 space-y-3">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase animate-pulse">Memuat Variasi...</p>
                                </div>
                            ) : variations.length > 0 ? (
                                variations.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => {
                                            if (variationPickerProduct) {
                                                addToCart({ ...v, name: variationPickerProduct.name });
                                                setVariationPickerProduct(null);
                                            }
                                        }}
                                        className="w-full p-3 bg-muted/30 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center justify-between group"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="flex flex-wrap gap-1">
                                                {v.attributes.map((attr: any) => (
                                                    <span key={attr.name} className="px-1.5 py-0.5 rounded bg-background text-[9px] font-bold border border-border text-primary uppercase">
                                                        {attr.option}
                                                    </span>
                                                ))}
                                            </div>
                                            <span className="text-[9px] font-medium text-muted-foreground">Stok: {v.stockQuantity}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-primary group-hover:scale-105 transition-transform">{formatCurrency(v.price)}</div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-8 space-y-2">
                                    <p className="text-xs text-muted-foreground italic">Variasi tidak tersedia.</p>
                                    <button
                                        onClick={() => setVariationPickerProduct(null)}
                                        className="text-[10px] font-black text-primary uppercase hover:underline"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Loading Overlay */}
            {isCheckingOut && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 max-w-sm text-center">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                            <div className="relative bg-primary/10 p-4 rounded-full">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Memproses Pesanan</h3>
                        <p className="text-muted-foreground text-sm">
                            Mohon tunggu sebentar, kami sedang mengirim data ke server...
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
