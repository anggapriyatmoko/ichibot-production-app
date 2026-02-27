'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, ShoppingCart, Minus, Plus, Trash2, X, Printer, Package, History, Edit2, Save, PlusCircle, Loader2, Download, ChevronRight, ChevronLeft, User, Camera, Upload, Image as ImageIcon, Archive } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/utils/format'
import Image from 'next/image'
import { useConfirmation } from '@/components/providers/modal-provider'
import { QuantityInput } from '@/components/ui/quantity-input'
import { processImageFile } from '@/utils/image-compression'
import { useRef } from 'react'
import { useAlert } from '@/hooks/use-alert'
import { createServiceProduct, updateServiceProduct, deleteServiceProduct, exportServiceProducts, importServiceProducts } from '@/app/actions/service-product'
import { checkoutServiceOrder, getServiceOrderHistory, exportServiceOrders, importServiceOrders } from '@/app/actions/service-order'
import Modal from '@/components/ui/modal'

type ServiceProduct = {
    id: string
    name: string
    sku: string | null
    price: number
    salePrice: number | null
    stock: number
    description: string | null
    image: string | null
}

type CartItem = ServiceProduct & {
    quantity: number
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
    user: { name: string | null, username: string | null } | null
    items: {
        id: string
        productName: string
        productPrice: number
        productImage: string | null
        quantity: number
    }[]
}

export default function POSServiceSystem({
    initialProducts,
    userName = 'Admin'
}: {
    initialProducts: ServiceProduct[],
    userName?: string
}) {
    const CART_STORAGE_KEY = 'pos_service_cart'
    const SAVED_CARTS_KEY = 'pos_service_saved_carts'
    const { showConfirmation } = useConfirmation()
    const { showAlert } = useAlert()

    const [products, setProducts] = useState<ServiceProduct[]>(initialProducts)
    const [cart, setCart] = useState<CartItem[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedCart = localStorage.getItem(CART_STORAGE_KEY)
                return savedCart ? JSON.parse(savedCart) : []
            } catch { return [] }
        }
        return []
    })

    const [savedCarts, setSavedCarts] = useState<SavedCart[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(SAVED_CARTS_KEY)
                return saved ? JSON.parse(saved) : []
            } catch { return [] }
        }
        return []
    })

    const [searchTerm, setSearchTerm] = useState('')
    const [shippingCost, setShippingCost] = useState(0)
    const [loading, setLoading] = useState(false)
    const [showReceipt, setShowReceipt] = useState(false)
    const [receiptData, setReceiptData] = useState<any>(null)
    const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products')
    const [showHistory, setShowHistory] = useState(false)
    const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historySearchTerm, setHistorySearchTerm] = useState('')

    // Image/Camera State
    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const importInputRef = useRef<HTMLInputElement>(null)
    const importHistoryRef = useRef<HTMLInputElement>(null)

    const router = useRouter()
    const [totalPages, setTotalPages] = useState(1)
    const [historyPage, setHistoryPage] = useState(1)

    // Product Form State
    const [isEditingProduct, setIsEditingProduct] = useState(false)
    const [currentProduct, setCurrentProduct] = useState<Partial<ServiceProduct> | null>(null)
    const [formLoading, setFormLoading] = useState(false)
    const [removeImage, setRemoveImage] = useState(false)

    // Save Cart Modal State
    const [showSaveCartModal, setShowSaveCartModal] = useState(false)
    const [saveCartNote, setSaveCartNote] = useState('')
    const [showSavedCartsList, setShowSavedCartsList] = useState(false)
    const [activeSavedCartId, setActiveSavedCartId] = useState<string | null>(null)

    // Helper to convert base64 to File/Blob
    const dataURLtoBlob = (dataurl: string) => {
        const arr = dataurl.split(',')
        if (arr.length < 2) return null
        const mime = arr[0].match(/:(.*?);/)?.[1]
        const bstr = atob(arr[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
        }
        return new Blob([u8arr], { type: mime })
    }

    // Sync cart to localStorage
    useEffect(() => {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
        if (cart.length === 0) {
            setActiveSavedCartId(null)
        }
    }, [cart])

    // Sync saved carts to localStorage
    useEffect(() => {
        localStorage.setItem(SAVED_CARTS_KEY, JSON.stringify(savedCarts))
    }, [savedCarts])

    const handleDownloadPDF = async () => {
        const receiptElement = document.getElementById('service-receipt')
        if (!receiptElement) return

        try {
            // Using toPng from html-to-image instead of html2canvas for better reliability
            const dataUrl = await toPng(receiptElement, {
                pixelRatio: 3,
                backgroundColor: '#ffffff',
                cacheBust: true,
                skipFonts: false
            })

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [70, 297]
            })

            const imgProps = pdf.getImageProperties(dataUrl)
            const pdfWidth = 70
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

            const finalPdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            })

            finalPdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)

            const now = new Date()
            const dateStr = now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }).split('/').reverse().join('-')
            const timeStr = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replace(/:/g, '-')
            const filename = `Service_${userName}_${dateStr}_${timeStr}.pdf`

            finalPdf.save(filename)
        } catch (error: any) {
            console.error('Error generating PDF:', error)
            showAlert(`Gagal membuat PDF: ${error.message || 'Error tidak diketahui'}`, 'error')
        }
    }

    const handlePrintReceipt = () => {
        const printWindow = window.open('', '_blank', 'width=280,height=600')
        if (!printWindow || !receiptData) return

        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Receipt Service</title>
                    <style>
                        @page { size: 70mm auto; margin: 0; }
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            width: 70mm;
                            margin: 0;
                            padding: 5mm;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                            font-size: 12px;
                            line-height: 1.4;
                            color: #000;
                            background: #fff;
                        }
                        .header { text-align: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px dashed #000; }
                        .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
                        .header p { font-size: 12px; margin: 2px 0; }
                        .item { margin-bottom: 8px; display: flex; gap: 8px; }
                        .item-name { font-weight: bold; font-size: 12px; }
                        .item-details { display: flex; justify-content: space-between; font-size: 12px; color: #333; }
                        .total { margin-top: 10px; padding-top: 10px; border-top: 2px dashed #000; display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
                        .footer { text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #000; font-size: 10px; }
                    </style>
            </head>
            <body>
                <div class="header">
                    <h1>ICHIBOT SERVICE</h1>
                    <p>Bukti pembayaran service robot ichibot</p>
                    <p style="font-size: 12px; font-weight: bold; color: #000; margin: 5px 0;">${receiptData.orderNumber}</p>
                    <p>${new Date(receiptData.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replace(/\./g, ':')}</p>
                </div>
                <div class="items">
                    ${receiptData.items.map((item: any) => `
                        <div class="item">
                            <div style="flex: 1;">
                                <div class="item-name">${item.productName}</div>
                                <div class="item-details">
                                    <span>${item.quantity} x Rp ${formatNumber(item.productPrice)}</span>
                                    <span>Rp ${formatNumber(item.productPrice * item.quantity)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${receiptData.shippingCost > 0 ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #000;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span>Subtotal:</span>
                        <span>Rp ${formatNumber(receiptData.items.reduce((acc: number, i: any) => acc + (i.productPrice * i.quantity), 0))}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
                        <span>Biaya Pengiriman:</span>
                        <span>Rp ${formatNumber(receiptData.shippingCost)}</span>
                    </div>
                </div>` : ''}
                <div class="total">
                    <span>TOTAL:</span>
                    <span>Rp ${formatNumber(receiptData.items.reduce((acc: number, i: any) => acc + (i.productPrice * i.quantity), 0) + (receiptData.shippingCost || 0))}</span>
                </div>
                <div class="footer">
                    <p style="font-weight: bold; margin-bottom: 5px;">Printed by: ${userName}</p>
                    <p>Terimakasih sudah mempercayakan service robot di ICHIBOT ROBOTICS.</p>
                    <p>Cek katalog dan stock produk di <b>www.store.ichibot.id</b></p>
                    <div style="margin: 10px 0; border-top: 1px dashed #000;"></div>
                    <p>Semoga robot kakak bisa awet dan mendapatkan juara</p>
                    <div style="margin: 10px 0; border-top: 1px dashed #000;"></div>
                    <p>Instagram : @team.ichibot</p>
                    <p>Tokopedia : ICHIBOT</p>
                    <p>Shopee : ichibot</p>
                    <p>Youtube : ICHIBOT</p>
                    <p>Tiktok : @team.ichibot</p>
                </div>
                <script>window.onload = function() {window.print(); }</script>
            </body>
        </html>
`

        printWindow.document.write(receiptHTML)
        printWindow.document.close()
    }

    const handleShareWhatsApp = () => {
        if (!receiptData) return
        let message = `*ICHIBOT SERVICE - ${receiptData.orderNumber}*\\n\\n*Daftar Layanan/Sparepart:*\\n`
        receiptData.items.forEach((item: any, idx: number) => {
            message += `${idx + 1}. ${item.productName} (x${item.quantity}) - Rp ${formatNumber(item.productPrice * item.quantity)}\\n`
        })

        const subtotal = receiptData.items.reduce((acc: number, i: any) => acc + (i.productPrice * i.quantity), 0)
        if (receiptData.shippingCost > 0) {
            message += `\\nSubtotal: Rp ${formatNumber(subtotal)}\\n`
            message += `Biaya Pengiriman: Rp ${formatNumber(receiptData.shippingCost)}\\n`
        }
        const total = subtotal + (receiptData.shippingCost || 0)
        message += `\\n*Total Bayar: Rp ${formatNumber(total)}*\\n`
        message += `\\nPrinted by: ${userName}\\n`
        message += `\\nTerima kasih atas kepercayaan Anda!`

        const encodedMessage = encodeURIComponent(message)
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
        window.open(whatsappUrl, '_blank')
    }

    const filteredProducts = useMemo(() => {
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean)
        return products.filter(p =>
            searchWords.length === 0 || searchWords.every(word =>
                p.name.toLowerCase().includes(word) ||
                (p.sku && p.sku.toLowerCase().includes(word)) ||
                (p.description && p.description.toLowerCase().includes(word))
            )
        )
    }, [products, searchTerm])

    const addToCart = (product: ServiceProduct) => {
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

    const updateCartQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta)
                return { ...item, quantity: newQty }
            }
            return item
        }).filter(item => item.quantity > 0))
    }

    const cartSubtotal = cart.reduce((acc, item) => acc + (item.salePrice || item.price) * item.quantity, 0)
    const cartTotal = cartSubtotal + shippingCost

    const handleCheckout = async () => {
        if (cart.length === 0) return

        showConfirmation({
            title: 'Konfirmasi Checkout',
            message: `Apakah Anda yakin ingin melakukan checkout untuk ${cart.length} item? Total: Rp ${formatNumber(cartTotal)}`,
            type: 'confirm',
            action: async () => {
                setLoading(true)
                try {
                    const result = await checkoutServiceOrder(cart.map(item => ({
                        productId: item.id,
                        productName: item.name,
                        productPrice: item.salePrice || item.price,
                        productImage: item.image,
                        productSku: item.sku,
                        quantity: item.quantity
                    })))

                    if (result.success) {
                        setReceiptData({ ...result.order, shippingCost })
                        setShowReceipt(true)

                        // Update local stock state
                        setProducts(prev => prev.map(p => {
                            const cartItem = cart.find(ci => ci.id === p.id)
                            if (cartItem) {
                                return { ...p, stock: p.stock - cartItem.quantity }
                            }
                            return p
                        }))

                        // Remove if was a saved cart
                        if (activeSavedCartId) {
                            setSavedCarts(prev => prev.filter(c => c.id !== activeSavedCartId))
                            setActiveSavedCartId(null)
                        }

                        setCart([])
                        setShippingCost(0)
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

    const confirmSaveCart = () => {
        if (!saveCartNote.trim()) {
            showAlert('Keterangan harus diisi', 'error')
            return
        }

        const newSavedCart: SavedCart = {
            id: Date.now().toString(),
            items: [...cart],
            note: saveCartNote,
            createdAt: new Date().toISOString()
        }

        setSavedCarts([newSavedCart, ...savedCarts])
        setCart([])
        setShippingCost(0)
        setSaveCartNote('')
        setShowSaveCartModal(false)
        setActiveSavedCartId(null)
        showAlert('Keranjang berhasil disimpan', 'success')
    }

    const handleLoadSavedCart = (saved: SavedCart) => {
        setCart(saved.items)
        setSavedCarts(prev => prev.filter(c => c.id !== saved.id))
        setActiveSavedCartId(null)
        setSaveCartNote('')
        setShowSavedCartsList(false)
        showAlert('Keranjang berhasil dimuat', 'success')
    }

    const handleExport = async () => {
        try {
            const result = await exportServiceProducts()
            if (result.success) {
                const b64 = result.content;
                const fileName = result.fileName || `service_products_${new Date().toISOString().split('T')[0]}.xlsx`;

                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${b64}`);
                downloadAnchorNode.setAttribute("download", fileName);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                showAlert('Data berhasil diexport', 'success')
            } else {
                showAlert(result.error || 'Gagal export data', 'error')
            }
        } catch (error) {
            showAlert('Gagal export data', 'error')
        }
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const reader = new FileReader()
            reader.onload = async (event) => {
                try {
                    const resultData = event.target?.result as string
                    // Extract base64 part
                    const base64 = resultData.split(',')[1]

                    setLoading(true)
                    const result = await importServiceProducts(base64)
                    setLoading(false)

                    if (result.success) {
                        showAlert(result.message || 'Import berhasil', 'success')
                        router.refresh()
                    } else {
                        showAlert(result.error || 'Gagal import data', 'error')
                    }
                } catch (err) {
                    showAlert('Gagal membaca file Excel', 'error')
                }
            }
            reader.readAsDataURL(file)
        } catch (error) {
            showAlert('Gagal import data', 'error')
        } finally {
            if (importInputRef.current) importInputRef.current.value = ''
        }
    }

    const handleExportHistory = async () => {
        try {
            const result = await exportServiceOrders()
            if (result.success) {
                const b64 = result.content;
                const fileName = result.fileName || `service_orders_${new Date().toISOString().split('T')[0]}.xlsx`;

                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${b64}`);
                downloadAnchorNode.setAttribute("download", fileName);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                showAlert('Data history berhasil diexport', 'success')
            } else {
                showAlert(result.error || 'Gagal export data history', 'error')
            }
        } catch (error) {
            showAlert('Gagal export data', 'error')
        }
    }

    const handleImportHistory = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const reader = new FileReader()
            reader.onload = async (event) => {
                try {
                    const resultData = event.target?.result as string
                    const base64 = resultData.split(',')[1]

                    setLoading(true)
                    const result = await importServiceOrders(base64)
                    setLoading(false)

                    if (result.success) {
                        showAlert(result.message || 'Import history berhasil', 'success')
                        // Trigger reload of history
                        setHistoryPage(1)
                        getServiceOrderHistory(1, historySearchTerm).then(res => {
                            if (res.success && res.orders) {
                                setOrderHistory(res.orders)
                                setTotalPages(res.totalPages || 1)
                            }
                        })
                    } else {
                        showAlert(result.error || 'Gagal import history', 'error')
                    }
                } catch (err) {
                    showAlert('Gagal membaca file Excel', 'error')
                }
            }
            reader.readAsDataURL(file)
        } catch (error) {
            showAlert('Gagal import history', 'error')
        } finally {
            if (importHistoryRef.current) importHistoryRef.current.value = ''
        }
    }

    const handleDeleteSavedCart = (id: string) => {
        showConfirmation({
            title: 'Hapus Keranjang',
            message: 'Apakah Anda yakin ingin menghapus keranjang yang disimpan ini?',
            type: 'confirm',
            action: () => {
                setSavedCarts(savedCarts.filter(c => c.id !== id))
                showAlert('Keranjang berhasil dihapus', 'success')
            }
        })
    }

    const handleOpenAddProduct = () => {
        setCurrentProduct({
            name: '',
            sku: '',
            price: undefined,
            salePrice: null,
            stock: undefined,
            description: '',
        })
        setIsEditingProduct(true)
    }

    const handleOpenEditProduct = (product: ServiceProduct) => {
        setCurrentProduct(product)
        setIsEditingProduct(true)
        setRemoveImage(false)
    }

    // Image Handling Logic
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !currentProduct) return

        const processed = await processImageFile(file, showAlert, 700, 900)
        if (processed) {
            setRemoveImage(false)
            const reader = new FileReader()
            reader.onloadend = () => {
                setCurrentProduct({ ...currentProduct, image: reader.result as string })
            }
            reader.readAsDataURL(processed)
        }
    }

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 900, height: 900 }
            })
            setCameraStream(stream)
            setIsCameraOpen(true)
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play()
            }
        } catch (err) {
            showAlert('Tidak dapat mengakses kamera', 'error')
            console.error(err)
        }
    }

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop())
            setCameraStream(null)
        }
        setIsCameraOpen(false)
    }

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current && currentProduct) {
            const video = videoRef.current
            const canvas = canvasRef.current
            const context = canvas.getContext('2d')

            if (context) {
                // Square crop logic
                const size = Math.min(video.videoWidth, video.videoHeight)
                const startX = (video.videoWidth - size) / 2
                const startY = (video.videoHeight - size) / 2

                canvas.width = 900
                canvas.height = 900
                context.drawImage(video, startX, startY, size, size, 0, 0, 900, 900)

                const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
                setCurrentProduct({ ...currentProduct, image: dataUrl })
                setRemoveImage(false)
                stopCamera()
            }
        }
    }

    const handleSaveProduct = async () => {
        if (!currentProduct?.name || currentProduct.price === undefined) {
            showAlert('Nama dan harga harus diisi', 'error')
            return
        }

        setFormLoading(true)
        try {
            const formData = new FormData()
            formData.append('name', currentProduct.name)
            if (currentProduct.sku) formData.append('sku', currentProduct.sku)
            formData.append('price', currentProduct.price.toString())
            if (currentProduct.salePrice) formData.append('salePrice', currentProduct.salePrice.toString())
            formData.append('stock', (currentProduct.stock || 0).toString())
            if (currentProduct.description) formData.append('description', currentProduct.description)

            if (removeImage) {
                formData.append('removeImage', 'true')
            } else if (currentProduct.image && currentProduct.image.startsWith('data:')) {
                const blob = dataURLtoBlob(currentProduct.image)
                if (blob) {
                    formData.append('image', blob, 'product.jpg')
                }
            }

            let result
            if (currentProduct.id) {
                result = await updateServiceProduct(currentProduct.id, formData)
            } else {
                result = await createServiceProduct(formData)
            }

            if (result.success && result.product) {
                // Update local products state
                const newProduct = result.product
                setProducts(prev => {
                    if (currentProduct.id) {
                        return prev.map(p => p.id === currentProduct.id ? newProduct : p)
                    } else {
                        return [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name))
                    }
                })
                setIsEditingProduct(false)
                setRemoveImage(false)
                showAlert(currentProduct.id ? 'Produk diperbarui' : 'Produk ditambahkan', 'success')
                router.refresh()
            } else {
                showAlert(result.error || 'Gagal menyimpan produk', 'error')
            }
        } catch (error) {
            console.error('Error saving product:', error)
            showAlert('Terjadi kesalahan', 'error')
        } finally {
            setFormLoading(false)
        }
    }

    const handleDeleteProduct = (product: ServiceProduct) => {
        showConfirmation({
            title: 'Hapus Produk',
            message: `Apakah Anda yakin ingin menghapus produk "${product.name}"?`,
            type: 'confirm',
            action: async () => {
                try {
                    const result = await deleteServiceProduct(product.id)
                    if (result.success) {
                        setProducts(prev => prev.filter(p => p.id !== product.id))
                        showAlert('Produk berhasil dihapus', 'success')
                        router.refresh()
                    } else {
                        showAlert(result.error || 'Gagal menghapus produk', 'error')
                    }
                } catch (err) {
                    showAlert('Terjadi kesalahan', 'error')
                }
            }
        })
    }

    const fetchHistory = async (page = 1, search = '') => {
        setHistoryLoading(true)
        try {
            const result = await getServiceOrderHistory(page, search, 10)
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
                        mobileTab === 'products'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    Produk
                </button>
                <button
                    onClick={() => setMobileTab('cart')}
                    className={cn(
                        "flex-1 py-3 text-sm font-bold border-b-2 transition-colors relative",
                        mobileTab === 'cart'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
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

            <div className={cn(
                "flex-1 flex flex-col min-w-0 overflow-hidden",
                mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
            )}>
                {/* Header */}
                <header className="flex-shrink-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between z-20">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Package className="w-6 h-6 text-primary" />
                            POS Service
                        </h1>
                        <div className="hidden md:flex relative w-64 lg:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Cari sparepart service..."
                                className="w-full bg-muted/50 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            ref={importInputRef}
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={handleImport}
                        />
                        <button
                            onClick={handleExport}
                            className="hidden md:flex p-2 hover:bg-accent rounded-full transition-colors relative group"
                            title="Export Produk"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => importInputRef.current?.click()}
                            className="hidden md:flex p-2 hover:bg-accent rounded-full transition-colors relative group"
                            title="Import Produk"
                        >
                            <Upload className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowSavedCartsList(true)}
                            className="p-2 hover:bg-accent rounded-full transition-colors relative group"
                            title="Daftar Keranjang"
                        >
                            <Archive className="w-5 h-5" />
                            {savedCarts.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] font-bold text-white flex items-center justify-center rounded-full">
                                    {savedCarts.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setShowHistory(true)}
                            className="p-2 hover:bg-accent rounded-full transition-colors relative group"
                            title="Riwayat"
                        >
                            <History className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleOpenAddProduct}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            <PlusCircle className="w-5 h-5" />
                            <span className="hidden md:inline">Tambah Barang</span>
                            <span className="md:hidden">Tambah</span>
                        </button>
                    </div>
                </header>

                {/* Mobile Search */}
                <div className="md:hidden p-3 border-b border-border bg-card">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari sparepart service..."
                            className="w-full bg-muted/50 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-muted/10 relative">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                className="group bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col relative"
                            >
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-[-10px] group-hover:translate-y-0 z-10">
                                    <button
                                        onClick={() => handleOpenEditProduct(product)}
                                        className="p-2 bg-white/70 dark:bg-white/10 backdrop-blur-md text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg border border-white/20 active:scale-90"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProduct(product)}
                                        className="p-2 bg-white/70 dark:bg-white/10 backdrop-blur-md text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-lg border border-white/20 active:scale-90"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-4 flex flex-col h-full gap-4">
                                    <div className="w-full aspect-square rounded-xl bg-muted relative overflow-hidden shrink-0 shadow-inner">
                                        {product.image ? (
                                            <Image
                                                src={product.image}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                                unoptimized={product.image.startsWith('data:')}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30">
                                                <ImageIcon className="w-8 h-8 mb-1" />
                                                <span className="text-[8px] font-bold uppercase tracking-wider">No Image</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-sm line-clamp-3 mb-1">{product.name}</h3>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                {product.sku || 'No SKU'}
                                            </span>
                                            <p className="text-[10px] text-muted-foreground line-clamp-1">{product.description || '-'}</p>
                                        </div>
                                    </div>

                                    <div className="mt-auto space-y-3">
                                        <div className="flex flex-col">
                                            {product.salePrice && product.salePrice < product.price && (
                                                <span className="text-[10px] text-muted-foreground line-through decoration-rose-500/50">
                                                    Rp {formatNumber(product.price)}
                                                </span>
                                            )}
                                            <span className="text-xs font-bold text-primary">
                                                Rp {formatNumber(product.salePrice || product.price)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                                product.stock <= 0 ? "bg-rose-500/10 text-rose-600" :
                                                    product.stock <= 5 ? "bg-amber-500/10 text-amber-600" :
                                                        "bg-emerald-500/10 text-emerald-600"
                                            )}>
                                                Stock: {formatNumber(product.stock)}
                                            </span>

                                            <button
                                                onClick={() => addToCart(product)}
                                                disabled={product.stock <= 0}
                                                className="p-2 bg-primary text-primary-foreground rounded-xl active:scale-95 disabled:opacity-50 disabled:grayscale transition-all shadow-md shadow-primary/20"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>

            {/* Cart Panel - Desktop sidebar + Mobile full width */}
            <div className={cn(
                "bg-card border-l border-border flex flex-col shadow-xl z-20 transition-all overflow-hidden",
                mobileTab === 'products' ? 'hidden lg:flex w-96' : 'flex-1 w-full lg:w-96'
            )}>
                <div className="hidden lg:flex p-4 border-b border-border items-center justify-between">
                    <h2 className="font-medium flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        Keranjang
                    </h2>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                        {cart.length} Pesanan
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex gap-4 p-3 rounded-2xl bg-muted/5 border border-transparent hover:border-border hover:bg-muted/10 transition-all group">
                            <div className="w-16 h-16 rounded-xl bg-muted relative overflow-hidden shrink-0 shadow-inner border border-border/50">
                                {item.image ? (
                                    <Image
                                        src={item.image}
                                        alt={item.name}
                                        fill
                                        className="object-cover"
                                        unoptimized={item.image.startsWith('data:')}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                        <ImageIcon className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm truncate">{item.name}</h4>
                                <p className="text-xs font-black text-primary mt-1">
                                    Rp {formatNumber(item.salePrice || item.price)}
                                </p>
                                <div className="flex items-center gap-1 mt-3">
                                    <button
                                        onClick={() => updateCartQuantity(item.id, -1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-background border border-border hover:bg-accent active:scale-90 transition-all"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-10 text-center text-sm font-bold tabular-nums">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => updateCartQuantity(item.id, 1)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-background border border-border hover:bg-accent active:scale-90 transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between items-end">
                                <button
                                    onClick={() => updateCartQuantity(item.id, -item.quantity)}
                                    className="p-1.5 text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <p className="text-sm font-black text-foreground tabular-nums">
                                    Rp {formatNumber((item.salePrice || item.price) * item.quantity)}
                                </p>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20 opacity-40">
                            <ShoppingCart className="w-16 h-16 mb-4" />
                            <p className="font-medium">Keranjang Kosong</p>
                            <p className="text-xs">Pilih produk untuk memulai checkout</p>
                        </div>
                    )}
                </div>

                <div className="p-4 md:p-6 bg-muted/5 border-t border-border space-y-3 md:space-y-4">
                    {/* Biaya Pengiriman */}
                    <div className="flex items-center gap-3 bg-card px-4 py-3 rounded-2xl border border-border">
                        <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Ongkir</label>
                        <div className="flex items-center gap-1 flex-1">
                            <span className="text-xs text-muted-foreground">Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={shippingCost === 0 ? '' : formatNumber(shippingCost)}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '')
                                    setShippingCost(raw ? parseInt(raw) : 0)
                                }}
                                placeholder="0"
                                className="flex-1 bg-transparent text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground/40 min-w-0"
                            />
                        </div>
                        {shippingCost > 0 && (
                            <button onClick={() => setShippingCost(0)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-2">
                        {shippingCost > 0 && (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Subtotal</span>
                                    <span className="text-xs font-medium text-muted-foreground">Rp {formatNumber(cartSubtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Ongkir</span>
                                    <span className="text-xs font-medium text-muted-foreground">Rp {formatNumber(shippingCost)}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-muted-foreground">Total Bayar</span>
                            <span className="text-lg font-bold text-primary">Rp {formatNumber(cartTotal)}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setShowSaveCartModal(true)}
                            disabled={cart.length === 0}
                            className="py-3 bg-secondary text-secondary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-secondary/80 active:scale-95 transition-all disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            SIMPAN
                        </button>
                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || loading}
                            className="py-3 bg-primary text-primary-foreground font-black rounded-2xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
                            CHECKOUT
                        </button>
                    </div>
                </div>
            </div>

            {/* Product Edit/Add Modal */}
            {isEditingProduct && currentProduct && (
                <Modal
                    isOpen={isEditingProduct}
                    onClose={() => setIsEditingProduct(false)}
                    title={currentProduct.id ? 'Edit Barang Service' : 'Tambah Barang Service'}
                    maxWidth="md"
                    footer={
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEditingProduct(false)}
                                className="flex-1 py-3 font-bold rounded-2xl border border-border hover:bg-muted transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSaveProduct}
                                disabled={formLoading}
                                className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 hover:shadow-lg hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50"
                            >
                                {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Simpan
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        {/* Product Image Section */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Product Image</label>
                            <div className="relative group border-2 border-dashed border-border rounded-3xl overflow-hidden bg-muted/30 aspect-square flex flex-col items-center justify-center p-4 transition-all hover:bg-muted/50">
                                {currentProduct.image ? (
                                    <>
                                        <img src={currentProduct.image} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => startCamera()}
                                                className="p-3 bg-white/20 backdrop-blur-md rounded-2xl hover:bg-white/40 transition-all"
                                                title="Ambil Foto"
                                            >
                                                <Camera className="w-6 h-6 text-white" />
                                            </button>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="p-3 bg-white/20 backdrop-blur-md rounded-2xl hover:bg-white/40 transition-all"
                                                title="Upload File"
                                            >
                                                <Upload className="w-6 h-6 text-white" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCurrentProduct({ ...currentProduct, image: null })
                                                    setRemoveImage(true)
                                                }}
                                                className="p-3 bg-rose-500/80 backdrop-blur-md rounded-2xl hover:bg-rose-500 transition-all"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-6 h-6 text-white" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center space-y-4">
                                        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                                            <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                                        </div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 leading-relaxed">
                                            Upload gambar atau ambil foto (maks 1MB)
                                        </p>
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={startCamera}
                                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold active:scale-95 transition-all"
                                            >
                                                <Camera className="w-4 h-4" />
                                                Ambil Foto
                                            </button>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-xl text-xs font-bold active:scale-95 transition-all"
                                            >
                                                <Upload className="w-4 h-4" />
                                                Pilih File
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Nama Barang</label>
                            <input
                                type="text"
                                value={currentProduct.name}
                                onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                                className="w-full bg-muted/50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">SKU</label>
                            <input
                                type="text"
                                value={currentProduct.sku || ''}
                                onChange={e => setCurrentProduct({ ...currentProduct, sku: e.target.value })}
                                placeholder="SO-XXX"
                                className="w-full bg-muted/50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Harga Normal</label>
                                <input
                                    type="number"
                                    value={currentProduct.price ?? ''}
                                    onChange={e => setCurrentProduct({ ...currentProduct, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                                    className="w-full bg-muted/50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Harga Diskon</label>
                                <input
                                    type="number"
                                    value={currentProduct.salePrice ?? ''}
                                    onChange={e => setCurrentProduct({ ...currentProduct, salePrice: e.target.value ? parseFloat(e.target.value) : null })}
                                    placeholder="Optional"
                                    className="w-full bg-muted/50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Stock</label>
                            <input
                                type="number"
                                value={currentProduct.stock ?? ''}
                                onChange={e => setCurrentProduct({ ...currentProduct, stock: e.target.value ? parseFloat(e.target.value) : undefined })}
                                className="w-full bg-muted/50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Keterangan</label>
                            <textarea
                                value={currentProduct.description || ''}
                                onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                                placeholder="Warna, tipe, dll..."
                                className="w-full bg-muted/50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]"
                            />
                        </div>
                    </div>
                </Modal>
            )}

            {/* History Modal */}
            {showHistory && (
                <Modal
                    isOpen={showHistory}
                    onClose={() => setShowHistory(false)}
                    title="Riwayat Order Service"
                    maxWidth="4xl"
                    className="p-0"
                    headerActions={
                        <div className="flex items-center gap-2 mr-2">
                            <div className="relative w-64 hidden sm:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Cari order number..."
                                    className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                    value={historySearchTerm}
                                    onChange={e => setHistorySearchTerm(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && fetchHistory(1, historySearchTerm)}
                                />
                            </div>
                            <input
                                type="file"
                                ref={importHistoryRef}
                                className="hidden"
                                accept=".xlsx, .xls"
                                onChange={handleImportHistory}
                            />
                            <button
                                onClick={handleExportHistory}
                                className="p-1.5 hover:bg-white/50 dark:hover:bg-black/50 rounded-lg transition-colors border border-transparent hover:border-border/50 bg-muted/50"
                                title="Export History"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => importHistoryRef.current?.click()}
                                className="p-1.5 hover:bg-white/50 dark:hover:bg-black/50 rounded-lg transition-colors border border-transparent hover:border-border/50 bg-muted/50"
                                title="Import History"
                            >
                                <Upload className="w-4 h-4" />
                            </button>
                        </div>
                    }
                    footer={
                        totalPages > 1 && (
                            <div className="flex justify-center gap-2">
                                <button
                                    disabled={historyPage <= 1}
                                    onClick={() => fetchHistory(historyPage - 1, historySearchTerm)}
                                    className="p-2 border border-border rounded-lg disabled:opacity-30 bg-background hover:bg-muted transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="flex items-center px-4 font-bold text-sm bg-muted/50 rounded-lg border border-border">{historyPage} / {totalPages}</span>
                                <button
                                    disabled={historyPage >= totalPages}
                                    onClick={() => fetchHistory(historyPage + 1, historySearchTerm)}
                                    className="p-2 border border-border rounded-lg disabled:opacity-30 bg-background hover:bg-muted transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    }
                >
                    <div className="p-6">
                        {historyLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                <p className="text-sm font-medium text-muted-foreground animate-pulse">Memuat riwayat transaksi...</p>
                            </div>
                        ) : orderHistory.length === 0 ? (
                            <div className="text-center py-20 flex flex-col items-center justify-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
                                    <History className="w-8 h-8 text-muted-foreground opacity-50" />
                                </div>
                                <h4 className="font-bold text-lg">Belum Ada Riwayat</h4>
                                <p className="text-sm text-muted-foreground max-w-sm">Transaksi service yang berhasil checkout akan muncul di sini beserta detail produknya.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                {orderHistory.map(order => (
                                    <div key={order.id} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/20 transition-all hover:shadow-md group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-black text-primary uppercase tracking-widest px-2 py-0.5 bg-primary/10 rounded border border-primary/20">{order.orderNumber}</p>
                                                    <span className="text-[10px] text-muted-foreground border border-border px-2 py-0.5 rounded flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {order.user?.name || order.user?.username || 'System'}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold mt-2 text-foreground/80">
                                                    {new Date(order.createdAt).toLocaleDateString('id-ID', {
                                                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setReceiptData(order)
                                                        setShowReceipt(true)
                                                    }}
                                                    className="p-2.5 bg-primary text-primary-foreground rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm shadow-primary/20"
                                                    title="Print Receipt"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2 border-t border-border/50 pt-4 mt-2">
                                            {order.items.map(item => (
                                                <div key={item.id} className="flex items-center gap-4 py-2 border-b border-border/30 last:border-0 text-sm">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-[13px] truncate">{item.productName}</p>
                                                        <p className="text-xs text-muted-foreground flex justify-between mt-0.5">
                                                            <span>x{item.quantity}</span>
                                                        </p>
                                                    </div>
                                                    <span className="font-bold text-[13px] whitespace-nowrap">Rp {formatNumber(item.productPrice * item.quantity)}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center pt-3 mt-1 border-t border-dashed border-border text-base font-black text-primary">
                                                <span>Total Nilai</span>
                                                <span>Rp {formatNumber(order.items.reduce((acc, i) => acc + (i.productPrice * i.quantity), 0))}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Receipt Modal */}
            {showReceipt && receiptData && (
                <Modal
                    isOpen={showReceipt && !!receiptData}
                    onClose={() => setShowReceipt(false)}
                    title="Receipt Service"
                    maxWidth="sm"
                    className="p-0 bg-white"
                    footer={
                        <div className="grid grid-cols-4 gap-2 no-print w-full">
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
                    }
                >
                    <div id="service-receipt" className="p-6 bg-white overflow-y-auto w-[70mm] mx-auto min-h-[100mm]">
                        <div className="text-center space-y-1 pb-4 border-b-2 border-dashed border-gray-300">
                            <h2 className="text-2xl font-black text-black">ICHIBOT SERVICE</h2>
                            <p className="text-[12px] text-black uppercase tracking-widest">Bukti pembayaran service robot ichibot</p>
                            <p className="text-[12px] font-bold mt-2 text-black">{receiptData.orderNumber}</p>
                            <p className="text-[12px] text-black">
                                {new Date(receiptData.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replace(/\./g, ':')}
                            </p>
                        </div>

                        <div className="mt-4 pt-2 space-y-3">
                            {receiptData.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex flex-col py-1 border-b border-gray-50 last:border-0">
                                    <div className="text-[12px] font-bold text-black leading-tight uppercase">
                                        {item.productName}
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <div className="text-[12px] text-black font-bold shrink-0">
                                            {item.quantity} x Rp {formatNumber(item.productPrice)}
                                        </div>
                                        <div className="text-right text-[12px] font-bold text-black">
                                            Rp {formatNumber(item.productPrice * item.quantity)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-3">
                            {receiptData.shippingCost > 0 && (
                                <>
                                    <div className="flex justify-between items-center text-[12px] text-black mb-1">
                                        <span>Subtotal:</span>
                                        <span>Rp {formatNumber(receiptData.items.reduce((acc: number, i: any) => acc + (i.productPrice * i.quantity), 0))}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[12px] text-black mb-2">
                                        <span>Biaya Pengiriman:</span>
                                        <span>Rp {formatNumber(receiptData.shippingCost)}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-between items-center font-bold text-[12px] text-black">
                                <span className="uppercase tracking-tighter">TOTAL:</span>
                                <span>Rp {formatNumber(receiptData.items.reduce((acc: number, i: any) => acc + (i.productPrice * i.quantity), 0) + (receiptData.shippingCost || 0))}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 space-y-4">
                            <div className="flex justify-between text-[12px]">
                                <span className="text-black">Printed by:</span>
                                <span className="font-bold text-black">{userName}</span>
                            </div>
                            <div className="text-center space-y-2 mt-6 pt-4 border-t border-gray-100">
                                <div className="space-y-1">
                                    <p className="text-[12px] text-black">Terimakasih sudah mempercayakan service robot di ICHIBOT ROBOTICS.</p>
                                    <p className="text-[12px] text-black">Cek katalog dan stock produk di <b>www.store.ichibot.id</b></p>
                                </div>
                                <hr className="border-gray-200" />
                                <p className="text-[12px] text-black font-medium">Semoga robot kakak bisa awet dan mendapatkan juara</p>
                                <hr className="border-gray-200" />
                                <div className="text-[12px] text-black space-y-0.5">
                                    <p>Instagram : @team.ichibot</p>
                                    <p>Tokopedia : ICHIBOT</p>
                                    <p>Shopee : ichibot</p>
                                    <p>Youtube : ICHIBOT</p>
                                    <p>Tiktok : @team.ichibot</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Camera Capture Modal Overlay */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black animate-in fade-in duration-300">
                    <div className="relative w-full max-w-lg aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover mirror"
                            style={{ transform: 'scaleX(-1)' }}
                        />
                        <div className="absolute inset-x-0 bottom-8 flex justify-center items-center gap-6">
                            <button
                                onClick={stopCamera}
                                className="p-4 bg-white/20 backdrop-blur-xl rounded-full hover:bg-white/30 transition-all border border-white/20"
                            >
                                <X className="w-8 h-8 text-white" />
                            </button>
                            <button
                                onClick={capturePhoto}
                                className="group p-1 bg-white rounded-full transition-all active:scale-90"
                            >
                                <div className="w-16 h-16 border-4 border-black rounded-full flex items-center justify-center">
                                    <div className="w-12 h-12 bg-primary rounded-full group-hover:scale-95 transition-transform" />
                                </div>
                            </button>
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                </div>
            )}

            {/* Save Cart Modal */}
            {showSaveCartModal && (
                <Modal
                    isOpen={showSaveCartModal}
                    onClose={() => { setShowSaveCartModal(false); setSaveCartNote(''); }}
                    title="Simpan Keranjang"
                    maxWidth="sm"
                    footer={
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => { setShowSaveCartModal(false); setSaveCartNote(''); }}
                                className="flex-1 py-3 bg-muted hover:bg-muted/80 font-bold rounded-2xl transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmSaveCart}
                                className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-2xl hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all"
                            >
                                Simpan
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Keterangan / Nama Simpanan</label>
                            <input
                                autoFocus
                                type="text"
                                value={saveCartNote}
                                onChange={(e) => setSaveCartNote(e.target.value)}
                                placeholder="Contoh: Robot A - Service Sensor"
                                className="w-full bg-muted/50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && confirmSaveCart()}
                            />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Saved Carts List Modal */}
            {showSavedCartsList && (
                <Modal
                    isOpen={showSavedCartsList}
                    onClose={() => setShowSavedCartsList(false)}
                    title={
                        <div className="flex items-center gap-3">
                            <Archive className="w-6 h-6 text-primary" />
                            <div>
                                <span className="block text-lg font-bold">Daftar Keranjang Disimpan</span>
                                <span className="block text-xs font-normal text-muted-foreground mt-0.5">{savedCarts.length} simpanan tersedia</span>
                            </div>
                        </div>
                    }
                    maxWidth="2xl"
                    className="p-6"
                >
                    <div className="space-y-4">
                        {savedCarts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-muted-foreground py-20 opacity-40">
                                <Archive className="w-16 h-16 mb-4" />
                                <p className="font-medium">Belum ada keranjang disimpan</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {savedCarts.map((saved) => (
                                    <div key={saved.id} className="bg-muted/10 border border-border rounded-2xl p-4 hover:bg-muted/20 transition-all group/card">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-primary">{saved.note}</h4>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                                                    {new Date(saved.createdAt).toLocaleDateString('id-ID', {
                                                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleLoadSavedCart(saved)}
                                                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
                                                >
                                                    Buka
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSavedCart(saved.id)}
                                                    className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                                            {saved.items.slice(0, 3).map((item, idx) => (
                                                <span key={idx} className="text-[10px] bg-muted px-2 py-1 rounded-md text-muted-foreground">
                                                    {item.name} x{item.quantity}
                                                </span>
                                            ))}
                                            {saved.items.length > 3 && (
                                                <span className="text-[10px] text-muted-foreground italic flex items-center">
                                                    +{saved.items.length - 3} lainnya
                                                </span>
                                            )}
                                            <div className="ml-auto text-xs font-bold text-primary">
                                                Total: Rp {formatNumber(saved.items.reduce((acc, i) => acc + (i.salePrice || i.price) * i.quantity, 0))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    )
}
