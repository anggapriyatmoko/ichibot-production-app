'use client'

import { useState, useEffect, useMemo } from 'react'
import { processBatchCheckoutBarang } from '@/app/actions/pos-barang'
import { getOrderHistory } from '@/app/actions/order'
import { Search, ShoppingCart, Minus, Plus, Trash2, X, Printer, Package, Download, History } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/utils/format'
import Image from 'next/image'
import { useConfirmation } from '@/components/providers/modal-provider'
import { QuantityInput } from '@/components/ui/quantity-input'

type Product = {
    id: string
    name: string
    stock: number
    sku: string | null
    image: string | null
    notes: string | null
    source: 'production' | 'project'
}

type CartItem = Product & {
    quantity: number
}

type OrderHistoryItem = {
    id: string
    orderNumber: string
    createdAt: Date
    user: { name: string | null, username: string } | null
    items: {
        id: string
        productName: string
        productSku: string | null
        productNote: string | null
        quantity: number
    }[]
}

export default function POSBarangSystem({
    productionProducts,
    projectProducts,
    userName = 'Admin'
}: {
    productionProducts: any[],
    projectProducts: any[],
    userName?: string
}) {
    const CART_STORAGE_KEY = 'pos_barang_cart'

    // Combine and normalize products
    const products = useMemo(() => {
        const normalizedProduction = productionProducts.map(p => ({
            ...p,
            source: 'production' as const,
            sku: p.sku || ''
        }))
        const normalizedProject = projectProducts.map(p => ({
            ...p,
            source: 'project' as const,
            sku: p.sku || ''
        }))
        return [...normalizedProduction, ...normalizedProject]
    }, [productionProducts, projectProducts])

    // Load cart from localStorage on mount
    const [cart, setCart] = useState<CartItem[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedCart = localStorage.getItem(CART_STORAGE_KEY)
                if (savedCart) {
                    return JSON.parse(savedCart)
                }
            } catch (error) {
                console.error('Failed to load cart from localStorage:', error)
            }
        }
        return []
    })

    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [showReceipt, setShowReceipt] = useState(false)
    const [receiptData, setReceiptData] = useState<CartItem[]>([])
    const [orderNumber, setOrderNumber] = useState<string>('')
    const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products')
    const [showHistory, setShowHistory] = useState(false)
    const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<OrderHistoryItem | null>(null)
    const [historySearchTerm, setHistorySearchTerm] = useState('')
    const [historyPage, setHistoryPage] = useState(1)
    const [filterSource, setFilterSource] = useState<'all' | 'production' | 'project'>('all')

    const HISTORY_PER_PAGE = 5
    const { showConfirmation } = useConfirmation()

    // Save cart to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
            } catch (error) {
                console.error('Failed to save cart to localStorage:', error)
            }
        }
    }, [cart])

    const handleDownloadPDF = async () => {
        const receiptElement = document.getElementById('receipt')
        if (!receiptElement) return

        try {
            const canvas = await html2canvas(receiptElement, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff'
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [80, 297]
            })

            const imgProps = pdf.getImageProperties(imgData)
            const pdfWidth = 80
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

            const finalPdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            })

            finalPdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

            const now = new Date()
            const dateStr = now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }).split('/').reverse().join('-')
            const timeStr = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replace(/:/g, '-')
            const filename = `${userName}_${dateStr}_${timeStr}.pdf`

            finalPdf.save(filename)
        } catch (error) {
            console.error('Error generating PDF:', error)
        }
    }

    const handlePrintReceipt = () => {
        const printWindow = window.open('', '_blank', 'width=280,height=600')
        if (!printWindow) return

        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Receipt</title>
                <style>
                    @page { size: 80mm auto; margin: 0; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        width: 80mm;
                        margin: 0;
                        padding: 5mm;
                        font-family: 'Courier New', monospace;
                        font-size: 10px;
                        line-height: 1.4;
                        color: #000;
                        background: #fff;
                    }
                    .header { text-align: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px dashed #000; }
                    .header h1 { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
                    .header p { font-size: 8px; margin: 2px 0; }
                    .item { margin-bottom: 8px; display: flex; gap: 8px; }
                    .item-name { font-weight: bold; font-size: 10px; }
                    .item-details { display: flex; justify-content: space-between; font-size: 9px; color: #333; }
                    .total { margin-top: 10px; padding-top: 10px; border-top: 2px dashed #000; display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; }
                    .footer { text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #000; font-size: 8px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Ichibot Production</h1>
                    <p>Bill of Materials (BOM) Request</p>
                    <p style="font-size: 11px; font-weight: bold; color: #2563eb; margin: 5px 0;">${orderNumber}</p>
                    <p>${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false })}</p>
                </div>
                <div class="items">
                    ${receiptData.map(item => `
                        <div class="item">
                            ${item.image ? `<img src="${window.location.origin}${item.image}" style="width: 40px; height: 40px; object-fit: cover; border: 1px solid #ddd;">` : `<div style="width: 40px; height: 40px; background-color: #f3f4f6; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 1px solid #ddd; font-family: sans-serif;">${item.name.charAt(0).toUpperCase()}</div>`}
                            <div style="flex: 1;">
                                <div class="item-name">${item.name} [${item.source.toUpperCase()}]</div>
                                <div class="item-details">
                                    <span>${item.sku || '-'}</span>
                                    <span>${item.quantity} pcs</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="total">
                    <span>TOTAL ITEMS:</span>
                    <span>${receiptData.reduce((acc, item) => acc + item.quantity, 0)} pcs</span>
                </div>
                <div class="footer">
                    <p>Thank you!</p>
                    <p>Powered by Ichibot</p>
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `

        printWindow.document.write(receiptHTML)
        printWindow.document.close()
    }

    const handleShareWhatsApp = () => {
        let message = `*${orderNumber}*\n\n*Daftar Item:*\n`
        receiptData.forEach((item, idx) => {
            message += `${idx + 1}. ${item.name} [${item.source.toUpperCase()}] - ${item.quantity} pcs\n`
            message += `   SKU: ${item.sku || '-'}\n`
        })

        const encodedMessage = encodeURIComponent(message)
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
        window.open(whatsappUrl, '_blank')
    }

    // Multi-word search
    const filteredProducts = useMemo(() => {
        let result = products

        if (filterSource !== 'all') {
            result = result.filter(p => p.source === filterSource)
        }

        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 0)
        if (searchWords.length > 0) {
            result = result.filter(p => {
                const productText = `${p.name} ${p.sku || ''}`.toLowerCase()
                return searchWords.every(word => productText.includes(word))
            })
        }

        return result.sort((a, b) => a.name.localeCompare(b.name))
    }, [products, searchTerm, filterSource])

    const addToCart = (product: Product) => {
        if (product.stock <= 0) return
        const existing = cart.find(item => item.id === product.id && item.source === product.source)
        if (existing) {
            if (existing.quantity >= product.stock) return
            setCart(cart.map(item =>
                (item.id === product.id && item.source === product.source)
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ))
        } else {
            // New items at the beginning
            setCart([{ ...product, quantity: 1 }, ...cart])
        }
    }

    const updateQuantity = (productId: string, source: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.id === productId && item.source === source) {
                const newQuantity = item.quantity + delta
                if (newQuantity <= 0) return item
                if (newQuantity > item.stock) return item
                return { ...item, quantity: newQuantity }
            }
            return item
        }))
    }

    const removeFromCart = (productId: string, source: string) => {
        setCart(cart.filter(item => !(item.id === productId && item.source === source)))
    }

    const loadOrderHistory = async () => {
        setHistoryLoading(true)
        try {
            const orders = await getOrderHistory()
            // Filter all relevant POS orders
            const posOrders = (orders as OrderHistoryItem[]).filter(o =>
                o.orderNumber.startsWith('ORD-') ||
                o.orderNumber.startsWith('ORDP-') ||
                o.orderNumber.startsWith('ORDB-')
            )
            setOrderHistory(posOrders)
        } catch (error) {
            console.error('Failed to load order history:', error)
        } finally {
            setHistoryLoading(false)
        }
    }

    const viewHistoryReceipt = (order: OrderHistoryItem) => {
        setOrderNumber(order.orderNumber)
        // Map history items back to CartItem format
        const mappedItems: CartItem[] = order.items.map(item => ({
            id: item.id,
            name: item.productName,
            sku: item.productSku,
            quantity: item.quantity,
            notes: item.productNote,
            // These properties are not in history but required by CartItem type
            stock: 0,
            image: null,
            source: 'production' // Default source for history display
        }))
        setReceiptData(mappedItems)
        setShowReceipt(true)
        setShowHistory(false) // Close history modal
    }

    const handleCheckout = async () => {
        showConfirmation({
            type: 'confirm',
            title: 'Complete Checkout',
            message: 'Are you sure you want to complete this checkout? This action cannot be undone.',
            action: async () => {
                setLoading(true)
                setMessage(null)
                try {
                    const checkoutItems = cart.map(item => ({
                        productId: item.id,
                        quantity: item.quantity,
                        source: item.source
                    }))
                    const result = await processBatchCheckoutBarang(checkoutItems)
                    setOrderNumber(result.orderNumber)
                    setReceiptData([...cart])
                    setCart([])
                    setShowReceipt(true)
                    setMessage({ type: 'success', text: 'Order processed successfully!' })
                } catch (e: any) {
                    setMessage({ type: 'error', text: e.message || 'Checkout failed' })
                } finally {
                    setLoading(false)
                }
            }
        })
    }

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] lg:h-[calc(100vh-120px)] gap-0 lg:gap-6 relative">
            {/* Left: Product Grid */}
            <div className={cn(
                "flex-1 flex flex-col bg-card border-t border-x border-border rounded-t-2xl lg:rounded-2xl lg:border overflow-hidden shadow-sm h-full",
                activeTab === 'products' ? 'flex' : 'hidden lg:flex'
            )}>
                <div className="p-3 border-b border-border flex flex-col sm:flex-row gap-3 bg-muted/30">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search materials..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-foreground outline-none focus:border-primary transition-all font-medium shadow-sm text-sm"
                        />
                    </div>
                    {/* Source Toggle */}
                    <div className="flex gap-1 bg-background border border-border rounded-xl p-1 shadow-sm">
                        <button
                            onClick={() => setFilterSource('all')}
                            className={cn(
                                "px-3 py-1 flex-1 text-xs font-bold rounded-lg transition-all",
                                filterSource === 'all' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            ALL
                        </button>
                        <button
                            onClick={() => setFilterSource('production')}
                            className={cn(
                                "px-3 py-1 flex-1 text-xs font-bold rounded-lg transition-all",
                                filterSource === 'production' ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            PROD
                        </button>
                        <button
                            onClick={() => setFilterSource('project')}
                            className={cn(
                                "px-3 py-1 flex-1 text-xs font-bold rounded-lg transition-all",
                                filterSource === 'project' ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            PROJ
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-0 lg:p-4 bg-background/50">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 pb-0 lg:pb-0">
                        {filteredProducts.map(product => (
                            <button
                                key={`${product.id}-${product.source}`}
                                disabled={product.stock <= 0}
                                onClick={() => addToCart(product)}
                                className={cn(
                                    "flex flex-col text-left bg-card border border-border rounded-t-lg lg:rounded-xl p-2 lg:p-3 hover:bg-accent hover:border-primary/50 transition-all group relative overflow-hidden shadow-sm",
                                    product.stock <= 0 && "opacity-50 cursor-not-allowed bg-muted"
                                )}
                            >
                                {/* Source Indicator Badge */}
                                <div className={cn(
                                    "absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase",
                                    product.source === 'production' ? "bg-amber-500" : "bg-blue-600"
                                )}>
                                    {product.source}
                                </div>

                                <div className="aspect-square w-full rounded-lg bg-muted mb-2 lg:mb-3 overflow-hidden relative">
                                    {product.image ? (
                                        <Image src={product.image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                            <div className="text-4xl font-bold opacity-20">{product.name.charAt(0)}</div>
                                        </div>
                                    )}
                                    {product.stock <= 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-white font-bold text-sm bg-destructive/90 px-2 py-1 rounded">Out of Stock</span>
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-semibold text-foreground text-xs lg:text-sm break-words w-full h-10 line-clamp-2">{product.name}</h3>
                                <div className="flex justify-between items-center mt-1 w-full text-xs">
                                    <span className="text-muted-foreground text-[10px] truncate max-w-[50%]">{product.sku || '-'}</span>
                                    <span className={cn("font-bold", product.stock <= 5 ? "text-red-500" : "text-emerald-500")}>
                                        {formatNumber(product.stock)} Unit
                                    </span>
                                </div>
                                {product.notes && (
                                    <div className="mt-1 w-full text-[10px] text-muted-foreground/80 italic whitespace-pre-wrap break-words line-clamp-1">
                                        Note: {product.notes}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Cart */}
            <div className={cn(
                "w-full lg:w-96 flex flex-col bg-card border-t border-x border-border rounded-t-2xl lg:rounded-2xl lg:border overflow-hidden shadow-lg h-full",
                activeTab === 'cart' ? 'flex' : 'hidden lg:flex'
            )}>
                <div className="p-3 border-b border-border bg-muted/30">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-primary" />
                        Current Order (Barang)
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50 pb-2 lg:pb-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <ShoppingCart className="w-12 h-12 mb-3" />
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={`${item.id}-${item.source}`} className="bg-card border border-border p-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-right-4 fade-in duration-200 shadow-sm relative overflow-hidden">
                                {/* Side source indicator */}
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1", item.source === 'production' ? "bg-amber-500" : "bg-blue-600")}></div>

                                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden relative shrink-0">
                                    {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className={cn(
                                            "text-[7px] px-1 rounded text-white font-bold",
                                            item.source === 'production' ? "bg-amber-500" : "bg-blue-600"
                                        )}>
                                            {item.source.charAt(0).toUpperCase()}
                                        </span>
                                        <h4 className="text-sm font-medium text-foreground truncate">{item.name}</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Stock: {formatNumber(item.stock)}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                                    <button
                                        onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.source, -1) : removeFromCart(item.id, item.source)}
                                        className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {item.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5 text-destructive" /> : <Minus className="w-3.5 h-3.5" />}
                                    </button>
                                    <QuantityInput
                                        value={item.quantity}
                                        onChange={(val: number) => {
                                            if (val > 0) {
                                                const diff = val - item.quantity
                                                updateQuantity(item.id, item.source, diff)
                                            }
                                        }}
                                        className="w-12 text-center text-sm font-bold bg-transparent border-none outline-none text-foreground appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <button
                                        onClick={() => updateQuantity(item.id, item.source, 1)}
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

                <div className="p-3 border-t border-border bg-muted/30 space-y-2 mb-7 lg:mb-0">
                    {message && (
                        <div className={cn("text-xs p-2 rounded text-center font-medium", message.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400')}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-between items-center text-muted-foreground text-xs">
                        <span>Total Items</span>
                        <span className="text-foreground font-bold">{totalItems}</span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                loadOrderHistory()
                                setShowHistory(true)
                            }}
                            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                            title="Order History"
                        >
                            <History className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleCheckout}
                            disabled={loading || cart.length === 0}
                            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-sm uppercase tracking-wide flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : null}
                            {loading ? 'Processing...' : 'Complete Checkout'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden flex z-50 h-14 shadow-lg">
                <button
                    onClick={() => setActiveTab('products')}
                    className={cn(
                        "flex-1 flex flex-col items-center justify-center py-2 transition-colors",
                        activeTab === 'products' ? "text-blue-600 bg-blue-50/50" : "text-gray-500"
                    )}
                >
                    <Package className="w-5 h-5" />
                    <span className="text-[10px] font-medium">PRODUCTS</span>
                </button>
                <div className="w-[1px] bg-gray-200 h-full"></div>
                <button
                    onClick={() => setActiveTab('cart')}
                    className={cn(
                        "flex-1 flex flex-col items-center justify-center py-2 transition-colors relative",
                        activeTab === 'cart' ? "text-blue-600 bg-blue-50/50" : "text-gray-500"
                    )}
                >
                    <div className="relative">
                        <ShoppingCart className="w-5 h-5" />
                        {totalItems > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[15px] flex items-center justify-center">
                                {totalItems}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-medium">CART</span>
                </button>
            </div>

            {/* Receipt Modal */}
            {showReceipt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center no-print">
                            <h3 className="text-lg font-bold text-gray-900 leading-tight uppercase tracking-tight">Receipt</h3>
                            <button
                                onClick={() => setShowReceipt(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        {/* Thermal Preview Section */}
                        <div id="receipt" className="p-6 bg-white overflow-y-auto max-h-[60vh]">
                            <div className="text-center font-mono space-y-1">
                                <h2 className="text-2xl font-black text-gray-900">Ichibot Production</h2>
                                <p className="text-[10px] text-gray-600">Bill of Materials (BOM) Request</p>
                                <p className="text-sm font-bold mt-2 text-blue-600">{orderNumber}</p>
                                <p className="text-[10px] text-gray-500">
                                    {new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replace(/\./g, ':')}
                                </p>
                            </div>

                            <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-4 space-y-3">
                                {receiptData.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 font-mono">
                                        {item.image ? (
                                            <div className="w-12 h-12 border border-gray-200 shrink-0 relative overflow-hidden">
                                                <Image src={item.image} alt="" fill className="object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 border border-gray-100 shrink-0 bg-gray-50 flex items-center justify-center text-gray-300 text-lg">
                                                {item.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold text-gray-900 line-clamp-2 leading-tight uppercase">
                                                {item.name}
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-[10px] text-gray-500">{item.sku || '-'}</span>
                                                <span className="text-[11px] font-bold text-gray-700">{item.quantity} pcs</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-3">
                                <div className="flex justify-between items-center font-mono font-black text-sm text-gray-900">
                                    <span className="uppercase tracking-tighter">TOTAL ITEMS:</span>
                                    <span>{receiptData.reduce((acc, item) => acc + item.quantity, 0)} pcs</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-100 space-y-4 font-mono">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-gray-500">Printed by:</span>
                                    <span className="font-bold text-gray-900">{userName}</span>
                                </div>
                                <div className="flex flex-col gap-1 border-b border-gray-300 pb-1">
                                    <span className="text-[11px] text-gray-500">Picked by:</span>
                                    <div className="h-4"></div>
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-[10px] text-gray-600">Thank you!</p>
                                    <p className="text-[9px] text-gray-400">Powered by Ichibot</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-3 border-t border-gray-200 grid grid-cols-4 gap-2 no-print bg-gray-50/50">
                            <button
                                onClick={handleDownloadPDF}
                                className="flex flex-col items-center justify-center p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all active:scale-95 group"
                            >
                                <Download className="w-4 h-4 mb-1 group-hover:translate-y-0.5 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest">PDF</span>
                            </button>
                            <button
                                onClick={handleShareWhatsApp}
                                className="flex flex-col items-center justify-center p-2 bg-[#25D366] hover:bg-[#1da851] text-white rounded-xl transition-all active:scale-95"
                            >
                                <svg className="w-4 h-4 mb-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                <span className="text-[10px] font-black uppercase tracking-widest">WA</span>
                            </button>
                            <button
                                onClick={handlePrintReceipt}
                                className="flex flex-col items-center justify-center p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all active:scale-95"
                            >
                                <Printer className="w-4 h-4 mb-1" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Print</span>
                            </button>
                            <button
                                onClick={() => setShowReceipt(false)}
                                className="flex flex-col items-center justify-center p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all active:scale-95"
                            >
                                <X className="w-4 h-4 mb-1" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-center leading-none">Close</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-600" />
                                Riwayat POS Barang
                            </h3>
                            <button
                                onClick={() => {
                                    setShowHistory(false)
                                    setHistorySearchTerm('')
                                    setHistoryPage(1)
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        <div className="p-3 border-b border-gray-100 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search order number, user, or item..."
                                    value={historySearchTerm}
                                    onChange={(e) => {
                                        setHistorySearchTerm(e.target.value)
                                        setHistoryPage(1)
                                    }}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {historyLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : (() => {
                                const filteredOrders = orderHistory.filter(order => {
                                    if (!historySearchTerm.trim()) return true
                                    const searchLower = historySearchTerm.toLowerCase()
                                    return (
                                        order.orderNumber.toLowerCase().includes(searchLower) ||
                                        (order.user?.name || order.user?.username || '').toLowerCase().includes(searchLower) ||
                                        order.items.some(item => item.productName.toLowerCase().includes(searchLower))
                                    )
                                })

                                const totalPages = Math.ceil(filteredOrders.length / HISTORY_PER_PAGE)
                                const startIndex = (historyPage - 1) * HISTORY_PER_PAGE
                                const paginatedOrders = filteredOrders.slice(startIndex, startIndex + HISTORY_PER_PAGE)

                                if (filteredOrders.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-gray-500">
                                            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                            <p>No order history found</p>
                                        </div>
                                    )
                                }

                                return (
                                    <>
                                        {/* Desktop View */}
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 text-left border-b border-gray-200">
                                                        <th className="px-3 py-2 font-semibold text-gray-700">Waktu & Tanggal</th>
                                                        <th className="px-3 py-2 font-semibold text-gray-700">Order No.</th>
                                                        <th className="px-3 py-2 font-semibold text-gray-700">User</th>
                                                        <th className="px-3 py-2 font-semibold text-gray-700">Daftar Barang</th>
                                                        <th className="px-3 py-2 font-semibold text-gray-700 text-center">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedOrders.map((order) => (
                                                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                            <td className="px-3 py-3 whitespace-nowrap">
                                                                {new Date(order.createdAt).toLocaleString('id-ID')}
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <span className="font-mono font-bold text-blue-600">{order.orderNumber}</span>
                                                            </td>
                                                            <td className="px-3 py-3 font-medium">
                                                                {order.user?.name || order.user?.username || '-'}
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <div className="text-xs text-gray-600 line-clamp-1">
                                                                    {order.items.map(item => `${item.productName} (${item.quantity})`).join(', ')}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3 text-center">
                                                                <button
                                                                    onClick={() => viewHistoryReceipt(order)}
                                                                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors group"
                                                                    title="Print Receipt"
                                                                >
                                                                    <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile View */}
                                        <div className="sm:hidden space-y-3">
                                            {paginatedOrders.map((order) => (
                                                <div key={order.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-mono font-bold text-blue-600 text-sm">{order.orderNumber}</span>
                                                            <span className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleDateString('id-ID')}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            <span className="font-medium">User:</span> {order.user?.name || order.user?.username || '-'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-2 line-clamp-2 italic">
                                                            {order.items.map(item => `${item.productName} (x${item.quantity})`).join(', ')}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => viewHistoryReceipt(order)}
                                                        className="ml-3 p-3 bg-white border border-gray-200 text-blue-600 rounded-xl shadow-sm active:scale-95 transition-all"
                                                    >
                                                        <Printer className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pagination */}
                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-center mt-6 gap-2">
                                                <button
                                                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                                    disabled={historyPage === 1}
                                                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30"
                                                >
                                                    Prev
                                                </button>
                                                <div className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold">
                                                    {historyPage} / {totalPages}
                                                </div>
                                                <button
                                                    onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={historyPage === totalPages}
                                                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
