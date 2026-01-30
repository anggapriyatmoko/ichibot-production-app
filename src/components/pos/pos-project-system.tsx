'use client'

import { useState, useEffect } from 'react'
import { processBatchCheckoutProject } from '@/app/actions/pos-project'
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
    sku: string
    image: string | null
    notes: string | null
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

export default function POSProjectSystem({ products, userName = 'Admin' }: { products: Product[], userName?: string }) {
    const CART_STORAGE_KEY = 'pos_project_cart'

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
    const HISTORY_PER_PAGE = 10
    const { showConfirmation } = useConfirmation()

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
            } catch (error) {
                console.error('Failed to save cart to localStorage:', error)
            }
        }
    }, [cart])

    // Multi-word search: all words must match (in name OR sku)
    const filteredProducts = products.filter(p => {
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 0)
        if (searchWords.length === 0) return true

        const productText = `${p.name} ${p.sku}`.toLowerCase()
        return searchWords.every(word => productText.includes(word))
    })

    const addToCart = (product: Product) => {
        if (product.stock <= 0) return
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

    const loadOrderHistory = async () => {
        setHistoryLoading(true)
        try {
            const orders = await getOrderHistory()
            // Filter only Project POS orders (ORDP-)
            setOrderHistory((orders as OrderHistoryItem[]).filter(o => o.orderNumber.startsWith('ORDP-')))
        } catch (error) {
            console.error('Failed to load order history:', error)
        } finally {
            setHistoryLoading(false)
        }
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
                    const result = await processBatchCheckoutProject(cart.map(item => ({ productId: item.id, quantity: item.quantity })))
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
                format: [80, 297] // A4 height but narrow width, let's stick to auto-height logic if possible, or just fixed large height
            })

            // Calculate height based on aspect ratio
            const imgProps = pdf.getImageProperties(imgData)
            const pdfWidth = 80 // 80mm width
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

            // Re-create PDF with exact dimensions
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
            setMessage({ type: 'error', text: 'Failed to generate PDF' })
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
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
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
                    .header {
                        text-align: center;
                        margin-bottom: 10px;
                        padding-bottom: 10px;
                        border-bottom: 2px dashed #000;
                    }
                    .header h1 {
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .header p {
                        font-size: 8px;
                        margin: 2px 0;
                    }
                    .item {
                        margin-bottom: 8px;
                    }
                    .item-name {
                        font-weight: bold;
                        font-size: 10px;
                    }
                    .item-details {
                        display: flex;
                        justify-content: space-between;
                        font-size: 9px;
                        color: #333;
                    }
                    .item-note {
                        font-size: 8px;
                        font-style: italic;
                        margin-top: 2px;
                        color: #555;
                    }
                    .total {
                        margin-top: 10px;
                        padding-top: 10px;
                        border-top: 2px dashed #000;
                        display: flex;
                        justify-content: space-between;
                        font-weight: bold;
                        font-size: 12px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 10px;
                        padding-top: 10px;
                        border-top: 1px solid #000;
                        font-size: 8px;
                    }
                    @media print {
                        body {
                            width: 80mm;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Ichibot Production</h1>
                    <p>Sparepart Project Request</p>
                    <p style="font-size: 11px; font-weight: bold; color: #2563eb; margin: 5px 0;">${orderNumber}</p>
                    <p>${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false })}</p>
                </div>
                
                <div class="items">
                    ${receiptData.map(item => `
                        <div class="item" style="display: flex; gap: 8px;">
                            ${item.image
                ? `<img src="${window.location.origin}${item.image}" style="width: 40px; height: 40px; object-fit: cover; border: 1px solid #ddd;">`
                : `<div style="width: 40px; height: 40px; background-color: #f3f4f6; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 1px solid #ddd; font-family: sans-serif;">${item.name.charAt(0).toUpperCase()}</div>`
            }
                            <div style="flex: 1;">
                                <div class="item-name">${item.name}</div>
                                <div class="item-details">
                                    <span>${item.sku}</span>
                                    <span>${item.quantity} pcs</span>
                                </div>
                                ${item.notes ? `<div class="item-note">Note: ${item.notes}</div>` : ''}
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
                
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `

        printWindow.document.write(receiptHTML)
        printWindow.document.close()
    }

    const handleShareWhatsApp = () => {
        let message = `*${orderNumber}*\n\n*Daftar Item Project:*\n`
        receiptData.forEach((item, idx) => {
            message += `${idx + 1}. ${item.name} - ${item.quantity} pcs\n`
            message += `   SKU: ${item.sku}\n`
            if (item.notes) {
                message += `   Note: ${item.notes}\n`
            }
        })

        const encodedMessage = encodeURIComponent(message)
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
        window.open(whatsappUrl, '_blank')
    }

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] lg:h-[calc(100vh-120px)] gap-0 lg:gap-6 relative">
            {/* Left: Product Grid */}
            <div className={cn(
                "flex-1 flex-col bg-card border-t border-x border-border rounded-t-2xl lg:rounded-2xl lg:border overflow-hidden shadow-sm h-full",
                activeTab === 'products' ? 'flex' : 'hidden lg:flex'
            )}>
                <div className="p-3 border-b border-border flex gap-4 bg-muted/30">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search project parts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-foreground outline-none focus:border-primary transition-all font-medium shadow-sm text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-0 lg:p-4 bg-background/50">
                    <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 pb-0 lg:pb-0">
                        {filteredProducts.map(product => (
                            <button
                                key={product.id}
                                disabled={product.stock <= 0}
                                onClick={() => addToCart(product)}
                                className={cn(
                                    "flex flex-col text-left bg-card border border-border rounded-t-lg lg:rounded-xl p-2 lg:p-3 hover:bg-accent hover:border-primary/50 transition-all group relative overflow-hidden shadow-sm",
                                    product.stock <= 0 && "opacity-50 cursor-not-allowed bg-muted"
                                )}
                            >
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
                                <h3 className="font-semibold text-foreground text-xs lg:text-sm break-words w-full">{product.name}</h3>
                                <div className="flex justify-between items-center mt-1 w-full text-xs">
                                    <span className="text-muted-foreground text-[10px]">{product.sku}</span>
                                    <span className={cn("font-bold", product.stock <= 5 ? "text-red-500" : "text-emerald-500")}>
                                        {formatNumber(product.stock)} Left
                                    </span>
                                </div>
                                {product.notes && (
                                    <div className="mt-1 w-full text-[10px] text-muted-foreground/80 italic whitespace-pre-wrap break-words">
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
                "w-full lg:w-96 flex-col bg-card border-t border-x border-border rounded-t-2xl lg:rounded-2xl lg:border overflow-hidden shadow-lg h-full",
                activeTab === 'cart' ? 'flex' : 'hidden lg:flex'
            )}>
                <div className="p-3 border-b border-border bg-muted/30">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-primary" />
                        Current Order (Project)
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
                            <div key={item.id} className="bg-card border border-border p-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-right-4 fade-in duration-200 shadow-sm">
                                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden relative shrink-0">
                                    {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-foreground truncate">{item.name}</h4>
                                    <p className="text-xs text-muted-foreground">Stock: {formatNumber(item.stock)}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                                    <button
                                        onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id)}
                                        className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {item.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5 text-destructive" /> : <Minus className="w-3.5 h-3.5" />}
                                    </button>
                                    <QuantityInput
                                        value={item.quantity}
                                        onChange={(val: number) => {
                                            if (val > 0) {
                                                const diff = val - item.quantity
                                                updateQuantity(item.id, diff)
                                            }
                                        }}
                                        className="w-16 text-center text-sm font-bold bg-transparent border-none outline-none text-foreground appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
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
                            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-sm"
                        >
                            {loading ? 'Processing...' : 'Complete Checkout'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation for Mobile */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden flex z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <button
                    onClick={() => setActiveTab('products')}
                    className={cn(
                        "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors",
                        activeTab === 'products' ? "text-blue-600 bg-blue-50/50" : "text-gray-500 hover:bg-gray-50"
                    )}
                >
                    <Package className="w-5 h-5" />
                    <span className="text-xs font-semibold">PRODUCTS</span>
                </button>
                <div className="w-[1px] bg-gray-200 h-full"></div>
                <button
                    onClick={() => setActiveTab('cart')}
                    className={cn(
                        "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative",
                        activeTab === 'cart' ? "text-blue-600 bg-blue-50/50" : "text-gray-500 hover:bg-gray-50"
                    )}
                >
                    <div className="relative">
                        <ShoppingCart className="w-5 h-5" />
                        {totalItems > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center">
                                {totalItems}
                            </span>
                        )}
                    </div>
                    <span className="text-xs font-semibold">CART</span>
                </button>
            </div>

            {/* Receipt Modal */}
            {showReceipt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
                        {/* Receipt Header - No Print */}
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center no-print">
                            <h3 className="text-lg font-bold text-gray-900">Receipt</h3>
                            <button
                                onClick={() => setShowReceipt(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        {/* Thermal Receipt - 80mm width */}
                        <div id="receipt" className="receipt-print" style={{ width: '80mm', margin: '0 auto', backgroundColor: '#ffffff' }}>

                            <div className="p-4" style={{ fontFamily: 'monospace', color: '#000000' }}>
                                {/* Store Header */}
                                <div className="text-center mb-4 border-b-2 border-dashed pb-3" style={{ borderColor: '#9ca3af' }}>
                                    <h2 className="text-xl font-bold">Ichibot Production</h2>
                                    <p className="text-xs mt-1">Sparepart Project Request</p>
                                    <p className="text-sm font-bold mt-2" style={{ color: '#2563eb' }}>{orderNumber}</p>
                                    <p className="text-xs mt-1">{new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false })}</p>
                                </div>

                                {/* Items */}
                                <div className="mb-4">
                                    {receiptData.map((item, idx) => (
                                        <div key={idx} className="mb-2 flex gap-2">
                                            {item.image ? (
                                                <div className="w-[40px] h-[40px] border border-gray-200 shrink-0 overflow-hidden relative">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={item.image} alt="" className="w-full h-full object-cover" style={{ objectFit: 'cover' }} />
                                                </div>
                                            ) : (
                                                <div className="w-[40px] h-[40px] border border-gray-200 shrink-0 overflow-hidden relative bg-gray-100 flex items-center justify-center text-gray-400 font-bold font-sans">
                                                    {item.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between text-[12px]">
                                                    <span className="font-bold">{item.name}</span>
                                                </div>
                                                <div className="flex justify-between text-[11px]" style={{ color: '#4b5563' }}>
                                                    <span>{item.sku}</span>
                                                    <span>{item.quantity} pcs</span>
                                                </div>
                                                {item.notes && (
                                                    <div className="text-[10px] italic mt-0.5" style={{ color: '#6b7280' }}>
                                                        Note: {item.notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Total */}
                                <div className="border-t-2 border-dashed pt-3 mt-3" style={{ borderColor: '#9ca3af' }}>
                                    <div className="flex justify-between font-bold text-[13px]">
                                        <span>TOTAL ITEMS:</span>
                                        <span>{receiptData.reduce((acc, item) => acc + item.quantity, 0)} pcs</span>
                                    </div>
                                </div>

                                {/* Extra Info */}
                                <div className="mt-4 pt-3 border-t border-dashed text-[11px] space-y-3" style={{ borderColor: '#9ca3af' }}>
                                    <div className="flex justify-between">
                                        <span style={{ color: '#4b5563' }}>Printed by:</span>
                                        <span className="font-bold">{userName}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span style={{ color: '#4b5563' }}>Picked by:</span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="text-center mt-4 pt-3 border-t text-[9px]" style={{ borderColor: '#d1d5db' }}>
                                    <p>Thank you!</p>
                                    <p className="mt-1">Powered by Ichibot</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons - No Print */}
                        <div className="p-3 border-t border-gray-200 flex gap-2 no-print">
                            <button
                                onClick={handleDownloadPDF}
                                className="flex-1 px-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-sm"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">PDF</span>
                            </button>
                            <button
                                onClick={handleShareWhatsApp}
                                className="flex-1 px-2 py-2 bg-[#25D366] hover:bg-[#1da851] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-sm"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                <span className="hidden sm:inline">WA</span>
                            </button>
                            <button
                                onClick={handlePrintReceipt}
                                className="flex-1 px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-sm"
                            >
                                <Printer className="w-4 h-4" />
                                <span className="hidden sm:inline">Print</span>
                            </button>
                            <button
                                onClick={() => setShowReceipt(false)}
                                className="flex-1 px-2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order History Modal - Uses filtered content */}
            {showHistory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-600" />
                                Order History (Project)
                            </h3>
                            <button
                                onClick={() => {
                                    setShowHistory(false)
                                    setSelectedHistoryOrder(null)
                                    setHistorySearchTerm('')
                                    setHistoryPage(1)
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-3 border-b border-gray-100 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by order number, user, or item name..."
                                    value={historySearchTerm}
                                    onChange={(e) => {
                                        setHistorySearchTerm(e.target.value)
                                        setHistoryPage(1) // Reset to first page on search
                                    }}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {historyLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : (() => {
                                // Filter orders based on search term
                                const filteredOrders = orderHistory.filter(order => {
                                    if (!historySearchTerm.trim()) return true
                                    const searchLower = historySearchTerm.toLowerCase()
                                    const orderNumberMatch = order.orderNumber.toLowerCase().includes(searchLower)
                                    const userMatch = (order.user?.name || order.user?.username || '').toLowerCase().includes(searchLower)
                                    const itemsMatch = order.items.some(item =>
                                        item.productName.toLowerCase().includes(searchLower) ||
                                        (item.productSku || '').toLowerCase().includes(searchLower)
                                    )
                                    return orderNumberMatch || userMatch || itemsMatch
                                })

                                const totalPages = Math.ceil(filteredOrders.length / HISTORY_PER_PAGE)
                                const startIndex = (historyPage - 1) * HISTORY_PER_PAGE
                                const paginatedOrders = filteredOrders.slice(startIndex, startIndex + HISTORY_PER_PAGE)

                                if (filteredOrders.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-gray-500">
                                            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                            <p>{historySearchTerm ? 'No matching orders found' : 'No order history found'}</p>
                                        </div>
                                    )
                                }

                                return (
                                    <>
                                        {/* Mobile Card View */}
                                        <div className="sm:hidden space-y-3">
                                            {paginatedOrders.map((order) => (
                                                <div
                                                    key={order.id}
                                                    className="bg-gray-50 rounded-lg p-3 border border-gray-100"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <span className="font-mono font-bold text-blue-600 text-sm">{order.orderNumber}</span>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {new Date(order.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-gray-600 mb-1">
                                                        <span className="font-medium">User:</span> {order.user?.name || order.user?.username || '-'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {order.items.slice(0, 2).map((item, idx) => (
                                                            <span key={idx}>
                                                                {item.productName} ({item.quantity})
                                                                {idx < Math.min(order.items.length - 1, 1) ? ', ' : ''}
                                                            </span>
                                                        ))}
                                                        {order.items.length > 2 && (
                                                            <span className="text-gray-400"> +{order.items.length - 2} more</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Desktop Table View */}
                                        <div className="hidden sm:block overflow-x-auto overflow-y-hidden">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 text-left">
                                                        <th className="px-3 py-2 font-semibold text-gray-700">Date & Time</th>
                                                        <th className="px-3 py-2 font-semibold text-gray-700">Order No.</th>
                                                        <th className="px-3 py-2 font-semibold text-gray-700">User</th>
                                                        <th className="px-3 py-2 font-semibold text-gray-700">Items</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedOrders.map((order) => (
                                                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                            <td className="px-3 py-3 whitespace-nowrap">
                                                                {new Date(order.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false })}
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <span className="font-mono font-bold text-blue-600">{order.orderNumber}</span>
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                {order.user?.name || order.user?.username || '-'}
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <div className="max-w-xs">
                                                                    {order.items.slice(0, 3).map((item, idx) => (
                                                                        <div key={idx} className="text-xs text-gray-600">
                                                                            • {item.productName} ({item.quantity} pcs)
                                                                        </div>
                                                                    ))}
                                                                    {order.items.length > 3 && (
                                                                        <div className="text-xs text-gray-400">
                                                                            +{order.items.length - 3} more items
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination */}
                                        {totalPages > 1 && (
                                            <div className="flex justify-between items-center mt-4">
                                                <div className="text-xs text-gray-500">
                                                    Page {historyPage} of {totalPages}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                                        disabled={historyPage === 1}
                                                        className="px-3 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200 disabled:opacity-50"
                                                    >
                                                        Previous
                                                    </button>
                                                    <button
                                                        onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                                                        disabled={historyPage === totalPages}
                                                        className="px-3 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200 disabled:opacity-50"
                                                    >
                                                        Next
                                                    </button>
                                                </div>
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
