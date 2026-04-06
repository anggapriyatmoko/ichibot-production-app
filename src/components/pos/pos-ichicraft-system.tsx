'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Search, ShoppingCart, Minus, Plus, Trash2, X, Printer, Package, History, ExternalLink, Archive, Eye, BadgePercent, FileDown, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/utils/format'

// Normalize old /uploads/... paths to /api/uploads/... for production compatibility
function normalizeImageUrl(url: string | null): string | null {
    if (!url) return null
    if (url.startsWith('/api/uploads/')) return url
    if (url.startsWith('/uploads/')) return `/api${url}`
    return url
}
import { useConfirmation } from '@/components/providers/modal-provider'
import { QuantityInput } from '@/components/ui/quantity-input'
import { useAlert } from '@/hooks/use-alert'
import Modal from '@/components/ui/modal'
import { createPortal } from 'react-dom'
import { checkoutIchicraftOrder, getIchicraftOrderHistory } from '@/app/actions/ichicraft-order'

type IchicraftProduct = {
    id: string
    name: string
    satuan: string
    harga: number
    keterangan: string | null
    categoryId: string
    image?: string | null
}

type CartItem = IchicraftProduct & {
    quantity: number
    itemDiscountType?: 'percent' | 'nominal'
    itemDiscountValue?: number
}

type SavedCart = {
    id: string
    items: CartItem[]
    note: string
    createdAt: string
}

type OrderHistoryItem = {
    id: string
    orderNumber: string
    createdAt: Date
    shippingCost: number
    discountNominal: number
    items: {
        id: string
        productName: string
        productPrice: number
        quantity: number
        satuan: string
        originalPrice: number | null
    }[]
}

export default function POSIchicraftSystem({
    initialProducts,
    userName = 'Admin'
}: {
    initialProducts: IchicraftProduct[],
    userName?: string
}) {
    const CART_STORAGE_KEY = 'pos_ichicraft_cart'
    const SAVED_CARTS_KEY = 'pos_ichicraft_saved_carts'
    const { showConfirmation } = useConfirmation()
    const { showAlert } = useAlert()

    const [products] = useState<IchicraftProduct[]>(initialProducts)
    const [cart, setCart] = useState<CartItem[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        try {
            const savedCart = localStorage.getItem(CART_STORAGE_KEY)
            if (savedCart) {
                setCart(JSON.parse(savedCart))
            }
        } catch {}
        setIsLoaded(true)
    }, [])

    const [searchTerm, setSearchTerm] = useState('')
    const [viewingProduct, setViewingProduct] = useState<IchicraftProduct | null>(null)
    
    // Item Discount State
    const [discountingItem, setDiscountingItem] = useState<CartItem | null>(null)
    const [itemDiscountTypeInput, setItemDiscountTypeInput] = useState<'percent' | 'nominal'>('nominal')
    const [itemDiscountValueInput, setItemDiscountValueInput] = useState<string>('')
    
    // Discount and Shipping
    const [shippingCost, setShippingCost] = useState<number>(0)
    const [discountInput, setDiscountInput] = useState<string>('')
    const [discountType, setDiscountType] = useState<'percent' | 'nominal'>('nominal')

    const [loading, setLoading] = useState(false)
    const [showReceipt, setShowReceipt] = useState(false)
    const [receiptData, setReceiptData] = useState<any>(null)
    const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products')
    const [showHistory, setShowHistory] = useState(false)
    const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historySearchTerm, setHistorySearchTerm] = useState('')

    // PDF Preview State
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
    const [showPdfPreview, setShowPdfPreview] = useState(false)
    const [pdfFilename, setPdfFilename] = useState('')

    const router = useRouter()
    const [totalPages, setTotalPages] = useState(1)
    const [historyPage, setHistoryPage] = useState(1)

    // Sync cart to localStorage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
        }
    }, [cart, isLoaded])

    const handlePrintReceipt = (overrideData?: any) => {
        const dataToPrint = overrideData || receiptData
        const printWindow = window.open('', '_blank', 'width=800,height=600')
        if (!printWindow || !dataToPrint) return

        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Receipt Ichicraft POS</title>
                <style>
                    @page { size: A5 landscape; margin: 10mm; }
                    /* Let standard system-ui font apply */
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        font-size: 11pt; /* Enforced 11pt */
                        line-height: 1.4;
                        color: #000;
                        background: #fff;
                        padding: 0;
                        margin: 0;
                    }
                    .container { display: flex; flex-direction: column; height: 100%; }
                    .header { text-align: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px dashed #000; }
                    .header h1 { font-size: 14pt; font-weight: bold; margin-bottom: 5px; }
                    .header p { margin: 2px 0; }
                    .meta { display: flex; justify-content: space-between; margin-bottom: 15px; }
                    .meta div { text-align: left; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    th, td { border-bottom: 1px solid #ddd; padding: 5px 0; text-align: left; }
                    th { font-weight: bold; border-bottom: 1px solid #000; }
                    .right { text-align: right; }
                    .center { text-align: center; }

                    .summary-section {
                        width: 50%;
                        float: right;
                    }
                    .summary-item { display: flex; justify-content: space-between; margin-bottom: 4px; }
                    .summary-item.total { font-weight: bold; font-size: 12pt; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
                    
                    .footer { clear: both; text-align: center; margin-top: 30px; padding-top: 10px; border-top: 1px dashed #000; font-size: 10pt; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>ICHICRAFT INVOICE</h1>
                        <p>A Creative Service by Ichibot - Fokus pada Layanan Jasa Kreatif</p>
                    </div>
                    <div class="meta">
                        <div>
                            <strong>No. Order:</strong> ${dataToPrint.orderNumber}<br/>
                            <strong>Tanggal:</strong> ${new Date(dataToPrint.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                        </div>
                        <div style="text-align: right;">
                            <strong>Kasir:</strong> ${userName}
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Deskripsi Produk</th>
                                <th class="center">Qty</th>
                                <th class="right">Harga Satuan</th>
                                <th class="right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dataToPrint.items.map((item: any) => `
                                <tr>
                                    <td>${item.productName}</td>
                                    <td class="center">${item.quantity} ${item.satuan && item.satuan !== '-' ? item.satuan : ''}</td>
                                    <td class="right">${item.originalPrice ? `<del style="color:#888; font-size:9pt; margin-right:4px;">Rp ${formatNumber(item.originalPrice)}</del> ` : ''}Rp ${formatNumber(item.productPrice)}</td>
                                    <td class="right">${item.originalPrice ? `<del style="color:#888; font-size:9pt; margin-right:4px;">Rp ${formatNumber(item.originalPrice * item.quantity)}</del> ` : ''}Rp ${formatNumber(item.productPrice * item.quantity)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="summary-section">
                        <div class="summary-item">
                            <span>Total Produk:</span>
                            <span>Rp ${formatNumber(dataToPrint.items.reduce((acc: number, i: any) => acc + (i.productPrice * i.quantity), 0))}</span>
                        </div>
                        ${dataToPrint.discountNominal > 0 ? `
                        <div class="summary-item" style="color: #d32f2f;">
                            <span>Diskon:</span>
                            <span>- Rp ${formatNumber(dataToPrint.discountNominal)}</span>
                        </div>` : ''}
                        ${dataToPrint.shippingCost > 0 ? `
                        <div class="summary-item">
                            <span>Biaya Pengiriman:</span>
                            <span>Rp ${formatNumber(dataToPrint.shippingCost)}</span>
                        </div>` : ''}
                        <div class="summary-item total">
                            <span>TOTAL:</span>
                            <span>Rp ${formatNumber(dataToPrint.items.reduce((acc: number, i: any) => acc + (i.productPrice * i.quantity), 0) - dataToPrint.discountNominal + dataToPrint.shippingCost)}</span>
                        </div>
                    </div>

                    <div class="footer">
                        <p>Terima kasih atas pesanan Anda!</p>
                        <p>Ig: @team.ichibot</p>
                    </div>
                </div>
                <script>window.onload = function() {window.print(); }</script>
            </body>
            </html>
        `

        printWindow.document.write(receiptHTML)
        printWindow.document.close()
    }

    const handleGeneratePdf = async (overrideData?: any) => {
        const dataToPrint = overrideData || receiptData
        if (!dataToPrint) return

        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 12

        // Header
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('ICHICRAFT INVOICE', pageWidth / 2, margin + 4, { align: 'center' })
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text('A Creative Service by Ichibot - Fokus pada Layanan Jasa Kreatif', pageWidth / 2, margin + 10, { align: 'center' })

        // Dashed line
        doc.setLineDashPattern([2, 1], 0)
        doc.setLineWidth(0.3)
        doc.line(margin, margin + 14, pageWidth - margin, margin + 14)
        doc.setLineDashPattern([], 0)

        // Meta info
        const metaY = margin + 20
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('No. Order:', margin, metaY)
        doc.setFont('helvetica', 'normal')
        doc.text(dataToPrint.orderNumber || '-', margin + 22, metaY)
        doc.setFont('helvetica', 'bold')
        doc.text('Tanggal:', margin, metaY + 5)
        doc.setFont('helvetica', 'normal')
        doc.text(new Date(dataToPrint.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), margin + 22, metaY + 5)
        doc.setFont('helvetica', 'normal')
        doc.text(`Kasir: ${userName}`, pageWidth - margin, metaY, { align: 'right' })

        // Table - for discount items, store info for custom drawing
        const discountInfo: Record<number, { origPrice: string; discPrice: string; origSub: string; discSub: string }> = {}
        const tableBody = dataToPrint.items.map((item: any, idx: number) => {
            const qtyStr = `${item.quantity}${item.satuan && item.satuan !== '-' ? ' ' + item.satuan : ''}`
            if (item.originalPrice) {
                discountInfo[idx] = {
                    origPrice: `Rp ${formatNumber(item.originalPrice)}`,
                    discPrice: `Rp ${formatNumber(item.productPrice)}`,
                    origSub: `Rp ${formatNumber(item.originalPrice * item.quantity)}`,
                    discSub: `Rp ${formatNumber(item.productPrice * item.quantity)}`,
                }
                // Empty string - we draw custom text in didDrawCell
                return [item.productName, qtyStr, ' ', ' ']
            }
            return [item.productName, qtyStr, `Rp ${formatNumber(item.productPrice)}`, `Rp ${formatNumber(item.productPrice * item.quantity)}`]
        })

        autoTable(doc, {
            startY: metaY + 10,
            head: [['Deskripsi Produk', 'Qty', 'Harga Satuan', 'Subtotal']],
            body: tableBody,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.2 },
            headStyles: { fontStyle: 'bold', fillColor: false, textColor: [0, 0, 0], lineWidth: { bottom: 0.5 }, lineColor: [0, 0, 0] },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'center', cellWidth: 22 },
                2: { halign: 'right', cellWidth: 50 },
                3: { halign: 'right', cellWidth: 50 },
            },
            margin: { left: margin, right: margin },
            didDrawCell: (data: any) => {
                if (data.section !== 'body') return
                const info = discountInfo[data.row.index]
                if (!info) return
                if (data.column.index !== 2 && data.column.index !== 3) return

                const origText = data.column.index === 2 ? info.origPrice : info.origSub
                const discText = data.column.index === 2 ? info.discPrice : info.discSub
                const rightX = data.cell.x + data.cell.width - data.cell.padding('right')
                const cellMidY = data.cell.y + data.cell.height / 2 + 1

                doc.setFontSize(9)
                doc.setFont('helvetica', 'normal')

                // Draw discounted price (right-most)
                const discW = doc.getTextWidth(discText)
                doc.setTextColor(0, 0, 0)
                doc.text(discText, rightX, cellMidY, { align: 'right' })

                // Draw original price with strikethrough (left of discounted price)
                const gap = 3
                const origX = rightX - discW - gap
                doc.setTextColor(140, 140, 140)
                doc.setFontSize(8)
                const origW = doc.getTextWidth(origText)
                doc.text(origText, origX, cellMidY, { align: 'right' })

                // Strikethrough line
                doc.setDrawColor(140, 140, 140)
                doc.setLineWidth(0.3)
                doc.line(origX - origW, cellMidY - 1, origX, cellMidY - 1)

                // Reset
                doc.setTextColor(0, 0, 0)
                doc.setFontSize(9)
            },
        })

        const afterTableY = (doc as any).lastAutoTable.finalY + 5

        // Summary - right aligned
        const summaryX = pageWidth - margin
        const labelX = summaryX - 60
        let sY = afterTableY
        const itemsTotal = dataToPrint.items.reduce((acc: number, i: any) => acc + (i.productPrice * i.quantity), 0)

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text('Total Produk:', labelX, sY, { align: 'right' })
        doc.text(`Rp ${formatNumber(itemsTotal)}`, summaryX, sY, { align: 'right' })
        sY += 5

        if (dataToPrint.discountNominal > 0) {
            doc.setTextColor(211, 47, 47)
            doc.text('Diskon:', labelX, sY, { align: 'right' })
            doc.text(`- Rp ${formatNumber(dataToPrint.discountNominal)}`, summaryX, sY, { align: 'right' })
            doc.setTextColor(0, 0, 0)
            sY += 5
        }
        if (dataToPrint.shippingCost > 0) {
            doc.text('Biaya Pengiriman:', labelX, sY, { align: 'right' })
            doc.text(`Rp ${formatNumber(dataToPrint.shippingCost)}`, summaryX, sY, { align: 'right' })
            sY += 5
        }

        // Total
        doc.setLineWidth(0.4)
        doc.line(labelX - 5, sY - 1, summaryX, sY - 1)
        sY += 3
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('TOTAL:', labelX, sY, { align: 'right' })
        const grandTotal = itemsTotal - (dataToPrint.discountNominal || 0) + (dataToPrint.shippingCost || 0)
        doc.text(`Rp ${formatNumber(grandTotal)}`, summaryX, sY, { align: 'right' })

        // Footer
        doc.setLineDashPattern([2, 1], 0)
        doc.setLineWidth(0.2)
        doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)
        doc.setLineDashPattern([], 0)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('Terima kasih atas pesanan Anda!', pageWidth / 2, pageHeight - 13, { align: 'center' })
        doc.text('Ig: @team.ichibot', pageWidth / 2, pageHeight - 9, { align: 'center' })

        // Show preview
        const blob = doc.output('blob')
        const url = URL.createObjectURL(blob)
        setPdfBlobUrl(url)
        setPdfFilename(`Invoice-${dataToPrint.orderNumber || 'ICHICRAFT'}.pdf`)
        setShowPdfPreview(true)
    }

    const filteredProducts = useMemo(() => {
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean)
        return products.filter(p =>
            searchWords.length === 0 || searchWords.every(word =>
                p.name.toLowerCase().includes(word) ||
                (p.keterangan && p.keterangan.toLowerCase().includes(word))
            )
        )
    }, [products, searchTerm])

    const addToCart = (product: IchicraftProduct) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id)
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                )
            }
            return [...prev, { ...product, quantity: 1 }]
        })
    }

    const updateCartQuantityState = (id: string, qty: number | string) => {
        let numericQty = typeof qty === 'string' ? parseFloat(qty.replace(',', '.')) : qty;
        if (isNaN(numericQty)) return; // Don't update if invalid input
        
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, quantity: numericQty }
            }
            return item
        }).filter(item => item.quantity > 0))
    }
    
    const removeCartItem = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id))
    }

    // Calculations
    const cartItemsSubtotal = cart.reduce((acc, item) => {
        let price = item.harga * item.quantity;
        let discount = 0;
        if (item.itemDiscountType === 'percent') {
            discount = price * ((item.itemDiscountValue || 0) / 100);
        } else if (item.itemDiscountType === 'nominal') {
            discount = item.itemDiscountValue || 0;
        }
        return acc + Math.max(0, price - discount);
    }, 0)
    
    // Discount Calculation
    const discountNominal = useMemo(() => {
        if (!discountInput) return 0;
        const inputNum = parseFloat(discountInput.replace(',', '.'));
        if (isNaN(inputNum)) return 0;
        
        if (discountType === 'percent') {
            return (cartItemsSubtotal * inputNum) / 100;
        } else {
            return inputNum;
        }
    }, [discountInput, discountType, cartItemsSubtotal])

    const cartTotal = Math.max(0, cartItemsSubtotal - discountNominal) + shippingCost

    const handleCheckout = async () => {
        if (cart.length === 0) return

        showConfirmation({
            title: 'Konfirmasi Checkout',
            message: `Apakah Anda yakin ingin melakukan checkout untuk ${cart.length} item? Total: Rp ${formatNumber(cartTotal)}`,
            type: 'confirm',
            action: async () => {
                setLoading(true)
                try {
                    const result = await checkoutIchicraftOrder({
                        items: cart.map(item => {
                            let price = item.harga * item.quantity;
                            let discount = 0;
                            if (item.itemDiscountType === 'percent') {
                                discount = price * ((item.itemDiscountValue || 0) / 100);
                            } else if (item.itemDiscountType === 'nominal') {
                                discount = item.itemDiscountValue || 0;
                            }
                            let effectiveSubtotal = Math.max(0, price - discount);
                            let effectivePricePerUnit = effectiveSubtotal / item.quantity;

                            return {
                                productId: item.id,
                                productName: item.name,
                                productPrice: effectivePricePerUnit,
                                quantity: item.quantity,
                                satuan: item.satuan,
                                originalPrice: discount > 0 ? item.harga : undefined
                            }
                        }),
                        shippingCost: shippingCost || 0,
                        discountNominal: discountNominal || 0
                    })

                    if (result.success) {
                        setReceiptData({ ...result.order, shippingCost, discountNominal })
                        setShowReceipt(true)

                        setCart([])
                        setShippingCost(0)
                        setDiscountInput('')
                        router.refresh()
                    } else {
                        showAlert(result.error || 'Terjadi kesalahan saat checkout', 'error')
                    }
                } catch (error) {
                    showAlert('Gagal melakukan checkout', 'error')
                } finally {
                    setLoading(false)
                }
            }
        })
    }

    const fetchHistory = async (page = 1, search = '') => {
        setHistoryLoading(true)
        try {
            const result = await getIchicraftOrderHistory(page, search, 10)
            if (result.success) {
                setOrderHistory(result.orders as any)
                setTotalPages(result.totalPages || 1)
                setHistoryPage(page)
            }
        } catch (err) {
            showAlert('Gagal mengambil riwayat', 'error')
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => {
        if (showHistory) {
            fetchHistory(1, historySearchTerm)
        }
    }, [showHistory])

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100dvh-120px)] md:h-[calc(100vh-160px)] bg-card border border-border rounded-2xl overflow-hidden relative shadow-sm">
            {/* Mobile Tab Bar */}
            <div className="lg:hidden shrink-0 flex items-center border-b border-border bg-card">
                <button
                    onClick={() => setMobileTab('products')}
                    className={cn(
                        "flex-1 py-3 text-sm font-bold border-b-2 transition-colors",
                        mobileTab === 'products' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    Produk
                </button>
                <button
                    onClick={() => setMobileTab('cart')}
                    className={cn(
                        "flex-1 py-3 text-sm font-bold border-b-2 transition-colors relative",
                        mobileTab === 'cart' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    Keranjang
                    {cart.length > 0 && (
                        <span className="absolute top-1 right-2 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] shadow-sm animate-in zoom-in duration-300">
                            {cart.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Left Panel: Products Catalog */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 overflow-hidden",
                mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
            )}>
                {/* Header */}
                <header className="flex-shrink-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between z-20">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Package className="w-6 h-6 text-primary" />
                            POS Ichicraft
                        </h1>
                        <div className="hidden md:flex relative w-64 lg:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Cari produk Ichicraft..."
                                className="w-full bg-muted/50 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowHistory(true)}
                            className="p-2 border border-border bg-background rounded-full hover:bg-muted transition-colors relative"
                            title="Riwayat Pesanan"
                        >
                            <History className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </header>

                {/* Mobile Search */}
                <div className="md:hidden p-4 border-b border-border bg-card">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari produk Ichicraft..."
                            className="w-full bg-muted/50 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-muted/10 p-4 md:p-6">
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-max gap-4">
                    {filteredProducts.map(product => {
                        const inCart = cart.find(c => c.id === product.id)?.quantity || 0
                        return (
                            <div
                                key={product.id}
                                onClick={(e) => {
                                    if ((e.target as HTMLElement).closest('.eye-btn')) return;
                                    addToCart(product)
                                }}
                                className={cn(
                                    "flex flex-col bg-card border border-border hover:border-primary hover:shadow-lg transition-all text-left animate-in fade-in slide-in-from-bottom-2 group rounded-xl overflow-hidden cursor-pointer",
                                    inCart > 0 && "ring-2 ring-primary ring-offset-2 border-primary"
                                )}
                            >
                                <div className="aspect-square relative bg-white border-b border-border overflow-hidden">
                                    {inCart > 0 && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-sm animate-in zoom-in duration-200">
                                            {inCart}
                                        </div>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingProduct(product);
                                        }}
                                        className="eye-btn absolute top-2 left-2 z-20 p-2 bg-background/80 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white shadow-lg"
                                        title="Detail Produk"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    {product.image ? (
                                        <Image src={normalizeImageUrl(product.image)!} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 50vw, 25vw" />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                            <Package className="w-16 h-16" />
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 flex-1 flex flex-col bg-card">
                                    <h3 className="font-semibold text-sm line-clamp-3 min-h-[3.75rem] text-foreground">
                                        {product.name}
                                    </h3>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                        <p className="text-[12px] text-primary font-medium leading-none">Satuan : {product.satuan || '-'}</p>
                                    </div>
                                    <div className="mt-auto pt-4 flex items-center justify-between">
                                        <span className="text-primary font-bold">
                                            Rp {formatNumber(product.harga)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    </div>
                </div>
            </div>

            {/* Right Panel: Cart */}
            <div className={cn(
                "lg:w-[400px] xl:w-[450px] shrink-0 bg-card border-l border-border flex flex-col shadow-[-4px_0_24px_-16px_rgba(0,0,0,0.1)]",
                mobileTab === 'products' ? 'hidden lg:flex' : 'flex'
            )}>
                <header className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        Keranjang
                    </h2>
                    {cart.length > 0 && (
                        <button
                            onClick={() => {
                                showConfirmation({
                                    title: 'Kosongkan Keranjang',
                                    message: 'Apakah Anda yakin ingin menghapus semua item dari keranjang?',
                                    type: 'confirm',
                                    action: () => setCart([])
                                })
                            }}
                            className="text-xs font-medium text-destructive hover:underline p-1"
                        >
                            Kosongkan
                        </button>
                    )}
                </header>

                {/* Cart Items Area */}
                <div className="flex-1 overflow-y-auto min-h-[100px] p-2 space-y-2 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3 opacity-50 px-6 text-center">
                            <ShoppingCart className="w-16 h-16" strokeWidth={1} />
                            <p className="font-medium text-sm">Keranjang masih kosong</p>
                            <p className="text-xs">Pilih produk dari daftar untuk menambahkan ke keranjang</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="p-3 bg-background border border-border rounded-xl hover:border-border/80 transition-colors animate-in slide-in-from-right-4 duration-300">
                                <div className="flex gap-3">
                                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                                        <Package className="w-6 h-6 text-muted-foreground/50" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="font-bold text-sm leading-tight text-foreground line-clamp-2 flex-1" title={item.name}>
                                                {item.name}
                                            </h4>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => {
                                                        setDiscountingItem(item);
                                                        setItemDiscountTypeInput(item.itemDiscountType || 'nominal');
                                                        setItemDiscountValueInput(item.itemDiscountValue ? item.itemDiscountValue.toString() : '');
                                                    }}
                                                    className="text-orange-500 hover:text-orange-600 bg-orange-500/10 p-1.5 rounded-md transition-colors"
                                                    title="Set Diskon Produk"
                                                >
                                                    <BadgePercent className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => removeCartItem(item.id)}
                                                    className="text-destructive hover:text-destructive/80 bg-destructive/10 p-1.5 rounded-md transition-colors"
                                                    title="Hapus item"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex flex-col items-start min-w-0">
                                                {item.itemDiscountValue ? (
                                                    <span className="text-[10px] text-muted-foreground line-through">
                                                        Rp {formatNumber(item.harga * item.quantity)}
                                                    </span>
                                                ) : null}
                                                <span className="text-xs font-bold text-primary truncate max-w-[100px]">
                                                    Rp {formatNumber(
                                                        Math.max(0, (item.harga * item.quantity) - (
                                                            item.itemDiscountType === 'percent' 
                                                                ? (item.harga * item.quantity * (item.itemDiscountValue || 0) / 100) 
                                                                : (item.itemDiscountValue || 0)
                                                        ))
                                                    )}
                                                </span>
                                                {item.itemDiscountValue ? (
                                                    <span className="text-[10px] text-orange-500 font-medium truncate max-w-[100px]">
                                                        Diskon: {item.itemDiscountType === 'percent' ? `${item.itemDiscountValue}%` : `Rp ${formatNumber(item.itemDiscountValue)}`}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-lg p-0.5">
                                                <input 
                                                    type="number" 
                                                    step="any"
                                                    className="w-16 h-7 text-center text-sm font-bold bg-transparent border-none focus:ring-0" 
                                                    value={item.quantity}
                                                    onChange={e => updateCartQuantityState(item.id, e.target.value)}
                                                />
                                                <span className="text-xs text-muted-foreground pr-2">{item.satuan}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Checkout Section Area */}
                <div className="p-4 bg-muted/30 border-t border-border space-y-4">
                    {/* Discount & Shipping Form */}
                    <div className="space-y-3 pt-2">
                        <div className="flex gap-2 items-center">
                            <span className="text-sm font-medium w-24">Diskon:</span>
                            <div className="flex-1 flex gap-2">
                                <select 
                                    className="bg-background border border-border rounded-md text-sm px-2"
                                    value={discountType}
                                    onChange={(e) => setDiscountType(e.target.value as any)}
                                >
                                    <option value="nominal">Rp</option>
                                    <option value="percent">%</option>
                                </select>
                                <input 
                                    type="number"
                                    step="any"
                                    value={discountInput}
                                    onChange={e => setDiscountInput(e.target.value)}
                                    placeholder={discountType === 'percent' ? "0" : "0"}
                                    className="flex-1 bg-background border border-border rounded-md text-sm px-3 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-sm font-medium w-24">Ongkir:</span>
                            <input 
                                type="number"
                                value={shippingCost || ''}
                                onChange={e => setShippingCost(parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="flex-1 bg-background border border-border rounded-md text-sm px-3 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                    </div>

                    {/* Summary Calculation */}
                    <div className="space-y-2 border-t border-border pt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal Produk</span>
                            <span className="font-medium">Rp {formatNumber(cartItemsSubtotal)}</span>
                        </div>
                        {discountNominal > 0 && (
                            <div className="flex justify-between text-sm text-destructive">
                                <span>Diskon</span>
                                <span className="font-medium">- Rp {formatNumber(discountNominal)}</span>
                            </div>
                        )}
                        {shippingCost > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Biaya Pengiriman</span>
                                <span className="font-medium">Rp {formatNumber(shippingCost)}</span>
                            </div>
                        )}
                        <div className="pt-2 border-t border-border/50 flex justify-between items-end">
                            <span className="font-bold">Total Bayar</span>
                            <div className="text-right">
                                <span className="text-2xl font-black text-primary tracking-tight">
                                    Rp {formatNumber(cartTotal)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || loading}
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                        {loading ? 'Memproses...' : 'Proses Pembayaran'}
                    </button>
                </div>
            </div>

            {/* Receipt Modal Overlay */}
            <Modal
                isOpen={showReceipt}
                onClose={() => setShowReceipt(false)}
                title="Transaksi Sukses"
                maxWidth="sm"
            >
                <div className="p-4 flex flex-col items-center">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <ShoppingCart className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black mb-1">Rp {formatNumber(cartTotal)}</h2>
                    <p className="text-muted-foreground font-medium mb-8">Order: {receiptData?.orderNumber}</p>
                    
                    <div className="w-full grid grid-cols-1 gap-3">
                        <button
                            onClick={() => handlePrintReceipt()}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            <Printer className="w-5 h-5" />
                            Cetak Struk (A5 Landscape)
                        </button>
                        <button
                            onClick={() => handleGeneratePdf()}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <FileDown className="w-5 h-5" />
                            Generate PDF
                        </button>
                        <button
                            onClick={() => setShowReceipt(false)}
                            className="w-full py-3 bg-muted text-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-muted/80 transition-colors"
                        >
                            Selesai
                        </button>
                    </div>
                </div>
            </Modal>

            {/* History Overlay */}
            <Modal
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                title="Riwayat Pesanan Ichicraft"
                maxWidth="3xl"
            >
                <div className="space-y-4 p-2">
                    <div className="flex justify-between items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Cari berdasarkan No. Order..."
                                className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                value={historySearchTerm}
                                onChange={(e) => setHistorySearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        fetchHistory(1, historySearchTerm)
                                    }
                                }}
                            />
                        </div>
                        <button
                            onClick={() => fetchHistory(1, historySearchTerm)}
                            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Cari
                        </button>
                    </div>

                    <div className="bg-muted/10 rounded-xl border border-border p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {historyLoading ? (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium">Memuat riwayat...</p>
                            </div>
                        ) : orderHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium">Belum ada riwayat pesanan</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orderHistory.map(order => (
                                    <div key={order.id} className="bg-card border border-border p-4 rounded-xl shadow-sm">
                                        <div className="flex justify-between items-start border-b border-border pb-3 mb-3">
                                            <div>
                                                <h4 className="font-bold text-lg">{order.orderNumber}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(order.createdAt).toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <p className="font-bold text-primary text-lg">
                                                    Rp {formatNumber(order.items.reduce((acc, i) => acc + (i.productPrice * i.quantity), 0) - order.discountNominal + order.shippingCost)}
                                                </p>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handlePrintReceipt(order)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted hover:bg-border transition-colors px-3 py-1.5 rounded-lg"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                        Struk
                                                    </button>
                                                    <button
                                                        onClick={() => handleGeneratePdf(order)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors px-3 py-1.5 rounded-lg"
                                                    >
                                                        <FileDown className="w-3.5 h-3.5" />
                                                        PDF
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {order.items.map(item => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span>{item.quantity}x {item.productName}</span>
                                                    <span className="text-right">
                                                        {item.originalPrice ? (
                                                            <span className="text-muted-foreground line-through mr-1.5 text-xs">
                                                                Rp {formatNumber(item.originalPrice * item.quantity)}
                                                            </span>
                                                        ) : null}
                                                        Rp {formatNumber(item.productPrice * item.quantity)}
                                                    </span>
                                                </div>
                                            ))}
                                            {order.discountNominal > 0 && (
                                                <div className="flex justify-between text-sm text-destructive font-medium">
                                                    <span>Diskon</span>
                                                    <span>- Rp {formatNumber(order.discountNominal)}</span>
                                                </div>
                                            )}
                                            {order.shippingCost > 0 && (
                                                <div className="flex justify-between text-sm text-muted-foreground font-medium">
                                                    <span>Ongkos Kirim</span>
                                                    <span>Rp {formatNumber(order.shippingCost)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-6 p-2 border-t border-border">
                                <button 
                                    onClick={() => fetchHistory(historyPage - 1, historySearchTerm)}
                                    disabled={historyPage === 1}
                                    className="px-4 py-2 bg-background border border-border rounded-lg shadow-sm disabled:opacity-50 hover:bg-muted transition-colors text-sm font-medium"
                                >
                                    Prev
                                </button>
                                <span className="px-4 py-2 font-medium bg-muted rounded-lg text-sm">
                                    Page {historyPage} of {totalPages}
                                </span>
                                <button 
                                    onClick={() => fetchHistory(historyPage + 1, historySearchTerm)}
                                    disabled={historyPage === totalPages}
                                    className="px-4 py-2 bg-background border border-border rounded-lg shadow-sm disabled:opacity-50 hover:bg-muted transition-colors text-sm font-medium"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Product Detail Modal */}
            <Modal
                isOpen={!!viewingProduct}
                onClose={() => setViewingProduct(null)}
                title={viewingProduct?.name || "Detail Produk"}
                maxWidth="3xl"
            >
                {viewingProduct && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                        {/* Image Section */}
                        <div className="flex flex-col items-center justify-center bg-background border border-border rounded-xl relative aspect-square md:aspect-auto overflow-hidden shadow-sm">
                            {viewingProduct.image ? (
                                <Image src={normalizeImageUrl(viewingProduct.image)!} alt={viewingProduct.name} fill className="object-contain p-4 transition-transform duration-500" />
                            ) : (
                                <Package className="w-24 h-24 text-muted-foreground/30" />
                            )}
                        </div>

                        {/* Info Section */}
                        <div className="flex flex-col space-y-4">
                            <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight hidden md:block">
                                {viewingProduct.name}
                            </h2>
                            <div className="space-y-1">
                                <div className="text-3xl font-black text-primary">
                                    Rp {formatNumber(viewingProduct.harga)}
                                </div>
                                <div className="text-xs font-semibold px-2 py-0.5 mt-2 rounded bg-muted border border-border text-foreground w-fit">
                                    Satuan: {viewingProduct.satuan.toUpperCase()}
                                </div>
                            </div>
                            
                            <hr className="border-border my-2" />

                            <div className="flex-1 space-y-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                <h3 className="font-bold text-sm">Deskripsi Produk</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {viewingProduct.keterangan || 'Tidak ada keterangan khusus untuk produk ini.'}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-border mt-auto">
                                <button
                                    onClick={() => {
                                        addToCart(viewingProduct);
                                        setViewingProduct(null);
                                    }}
                                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold md:text-lg shadow-lg shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    Tambah ke Keranjang
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
            {/* Modal Diskon per Item */}
            <Modal
                isOpen={!!discountingItem}
                onClose={() => setDiscountingItem(null)}
                title={`Diskon: ${discountingItem?.name}`}
                maxWidth="sm"
                footer={
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setDiscountingItem(null)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted">Batal</button>
                        <button onClick={() => {
                            if (!discountingItem) return;
                            setCart(prev => prev.map(c => {
                                if (c.id === discountingItem.id) {
                                    return {
                                        ...c,
                                        itemDiscountType: itemDiscountTypeInput,
                                        itemDiscountValue: itemDiscountValueInput ? parseFloat(itemDiscountValueInput) : 0
                                    }
                                }
                                return c;
                            }));
                            setDiscountingItem(null);
                        }} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 shadow-sm">
                            Simpan Diskon
                        </button>
                    </div>
                }
            >
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Tipe Diskon</label>
                        <select
                            className="w-full bg-background border border-border rounded-md text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                            value={itemDiscountTypeInput}
                            onChange={e => setItemDiscountTypeInput(e.target.value as any)}
                        >
                            <option value="nominal">Nominal (Rp)</option>
                            <option value="percent">Persentase (%)</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Besaran Diskon</label>
                        <input
                            type="number"
                            step="any"
                            placeholder={itemDiscountTypeInput === 'percent' ? "Misal: 10" : "Misal: 5000"}
                            className="w-full bg-background border border-border rounded-md text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                            value={itemDiscountValueInput}
                            onChange={e => setItemDiscountValueInput(e.target.value)}
                        />
                        {itemDiscountTypeInput === 'percent' && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Diskon persentase dihitung dari subtotal item: Rp {formatNumber((discountingItem?.harga || 0) * (discountingItem?.quantity || 1))}
                            </p>
                        )}
                        {itemDiscountTypeInput === 'nominal' && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Masukkan nominal potongan harga total untuk baris item ini.
                            </p>
                        )}
                    </div>
                </div>
            </Modal>
            {/* PDF Preview Modal */}
            {showPdfPreview && pdfBlobUrl && createPortal(
                <>
                    <div
                        className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => { setShowPdfPreview(false); URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null) }}
                    />
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
                        <div
                            className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col animate-in zoom-in-95 fade-in duration-200 relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-border shrink-0 bg-white dark:bg-card z-20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                                        <FileDown className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground">Preview Invoice PDF</h2>
                                        <p className="text-xs text-gray-500 dark:text-muted-foreground">{pdfFilename}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const link = document.createElement('a')
                                            link.href = pdfBlobUrl
                                            link.download = pdfFilename
                                            document.body.appendChild(link)
                                            link.click()
                                            document.body.removeChild(link)
                                        }}
                                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors text-blue-600"
                                        title="Download PDF"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => { setShowPdfPreview(false); URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null) }}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-muted rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500 dark:text-muted-foreground" />
                                    </button>
                                </div>
                            </div>
                            {/* PDF iframe */}
                            <div className="flex-1 relative bg-gray-100 dark:bg-muted/30 overflow-hidden">
                                <iframe
                                    src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                                    className="w-full h-full border-0"
                                    title="PDF Preview"
                                />
                            </div>
                            {/* Footer */}
                            <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/30 rounded-b-2xl shrink-0 z-20">
                                <p className="text-xs text-gray-500 dark:text-muted-foreground font-mono truncate">{pdfFilename}</p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setShowPdfPreview(false); URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null) }}
                                        className="px-5 py-2 text-gray-700 dark:text-foreground font-semibold rounded-xl border border-gray-200 dark:border-border hover:bg-gray-100 dark:hover:bg-muted transition-colors"
                                    >
                                        Tutup
                                    </button>
                                    <button
                                        onClick={() => {
                                            const link = document.createElement('a')
                                            link.href = pdfBlobUrl
                                            link.download = pdfFilename
                                            document.body.appendChild(link)
                                            link.click()
                                            document.body.removeChild(link)
                                        }}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20 active:scale-95"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}
