'use client'

import { formatCurrency } from '@/utils/format'
import { Printer, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

type OrderItem = {
    name: string
    quantity: number
    price: number
    total: number
    sku?: string
    barcode?: string
    attributes?: any[]
}

type OrderDetails = {
    id: number
    number: string
    customerName: string
    date: string
    items: OrderItem[]
    total: number
    paymentMethod: string
    cashierName?: string
}

const RANDOM_QUOTES = [
    "Hidup itu kayak solder, kalau nggak hati-hati malah bikin hubungan jadi meleleh. Untungnya, Ichibot Store nggak bikin kantong meleleh!",
    "Kalau satu proyek gagal, jangan sedih. Setidaknya kamu masih bisa belanja komponen di Ichibot Store buat coba lagi!",
    "Jangan jadi seperti lampu pijar, dikit-dikit panas. Jadilah LED, terang tapi tetap hemat… kayak belanja di Ichibot Store!",
    "Kalau hidupmu terasa nge-lag, mungkin butuh upgrade… atau setidaknya cek katalog Ichibot Store buat komponen yang lebih cepat!",
    "Jangan gampang tersinggung, di dunia ini nggak semua hal harus dikasih resistor… tapi semua proyek pasti butuh Ichibot Store!",
    "Percayalah, bahkan robot aja butuh waktu buat booting, apalagi manusia! Tapi kalau butuh cepat, belanja di Ichibot Store aja!",
    "Kegagalan itu ibarat arus AC, naik turun terus. Yang penting jangan korslet! Kalau kurang alat, Ichibot Store selalu ada!",
    "Jangan terlalu cepat mengambil keputusan, kecuali kalau kamu mau jadi kapasitor… atau pas lihat promo di Ichibot Store!",
    "Kesuksesan itu seperti relay, kalau nggak ada trigger, ya nggak akan nyala. Tenang, Ichibot Store siap jadi trigger suksesmu!",
    "Jangan kayak solder abal-abal, dikit-dikit mati pas lagi panas-panasnya. Makanya, pakai yang berkualitas dari Ichibot Store!",
    "Mau jadi inovator sukses? Mulai dari komponen kecil, jangan langsung bikin Iron Man… kecuali kalau semua bahannya dari Ichibot Store!",
    "Jangan seperti kabel tanpa isolasi, gampang terhubung tapi nyetrum hati orang. Lebih baik koneksi yang stabil kayak layanan Ichibot Store!",
    "Semua butuh proses, bahkan Arduino aja perlu upload sketch dulu sebelum jalan. Kalau butuh modul, Ichibot Store siap support!",
    "Kalau hidup terasa berat, cek dulu apakah ada beban yang bisa dilepas… atau minimal cek promo di Ichibot Store buat hiburan!",
    "Orang sukses itu kayak microcontroller, kecil tapi otaknya jalan terus. Kalau mau ikut sukses, minimal punya module dari Ichibot Store!",
    "Jangan takut salah, karena tanpa kesalahan, multimeter nggak akan laku… dan tanpa inovasi, Ichibot Store nggak akan ramai!",
    "Hati-hati dalam memilih jalan, karena jalan pintas sering kali bikin short circuit… kecuali kalau jalan pintasnya ke Ichibot Store!",
    "Jangan menyerah! Bahkan servo motor aja tetap bisa gerak walau sering di-reset. Kalau butuh part, Ichibot Store siap kirim!",
    "Jadilah seperti sensor ultrasonik, selalu mengukur keadaan sebelum bertindak. Kalau belanja, ukur juga harganya… tapi di Ichibot Store pasti pas!",
    "Hidup ini kayak WiFi, kalau nggak ada koneksi, ya nggak bisa jalan. Makanya, koneksi ke Ichibot Store biar proyek nggak mandek!",
    "Jangan iri sama orang sukses, bisa jadi mereka pakai IC yang lebih canggih… atau belanjanya di Ichibot Store!",
    "Kesabaran itu penting, kecuali kalau lagi pegang solder panas… atau lagi nunggu paket dari Ichibot Store!",
    "Jangan kebanyakan teori, Einstein aja butuh eksperimen. Yuk, mulai bikin proyekmu sendiri! Bahannya? Di Ichibot Store!",
    "Jangan takut mencoba, kecuali kalau nyoba nyolok listrik tanpa tahu voltasenya… Tapi kalau belanja, Ichibot Store selalu aman!",
    "Hidup ini kayak rangkaian paralel, kalau satu putus masih bisa lanjut, asal ada jalur cadangan… kayak punya stok dari Ichibot Store!",
    "Jadilah seperti transistor, bisa menguatkan sinyal orang lain tanpa menghilangkan sinyal diri sendiri. Kalau sinyal jelek, cek IoT di Ichibot Store!",
    "Hidup itu kayak coding, kalau error tinggal cek ulang dan debug. Kalau butuh alat buat debug, Ichibot Store punya!",
    "Kalau hidup terasa stuck, mungkin waktunya ganti software… atau minimal upgrade alat dari Ichibot Store!",
    "Jangan lupa bersyukur, karena tanpa listrik pun, lilin masih bisa menyala… tapi kalau butuh listrik, Ichibot Store punya solusinya!",
    "Kalau hidup serasa nge-lag, mungkin butuh RAM tambahan… atau setidaknya kopi! Kalau proyek nge-lag, Ichibot Store siap support!",
    "Jadilah seperti fuse, hanya putus kalau memang benar-benar diperlukan. Kalau butuh ganti, Ichibot Store pasti ada!",
    "Jangan jadi kapasitor bocor, cuma bisa menyimpan energi sebentar lalu habis. Lebih baik jadi power supply yang stabil, kayak layanan Ichibot Store!",
    "Kalau ide belum jalan, mungkin belum ada power supply-nya. Tenang, Ichibot Store ada solusinya!",
    "Jangan terlalu cepat menyerah, Edison aja gagal 999 kali sebelum bikin lampu nyala… kalau kamu gagal, cek Ichibot Store dulu!",
    "Jangan kayak kabel longgar, gampang putus koneksi pas lagi dibutuhkan. Koneksi terbaik? Ke Ichibot Store dong!",
    "Kalau hidup terasa ribet, mungkin perlu di-reset dan mulai dari nol lagi. Kalau proyek ribet, mungkin perlu ganti modul dari Ichibot Store!",
    "Jangan khawatir soal gagal, karena setiap resistor pun punya batas toleransi. Kalau habis stok? Ichibot Store pasti ready!",
    "Kalau satu pintu tertutup, coba buka dengan servo motor! Ichibot Store siap menyediakan komponennya!",
    "Jangan biarkan kreativitasmu mati, karena ide-ide brilian butuh alat buat diwujudkan. Yuk, cek Ichibot Store!",
    "Kalau inovasi itu susah, kenapa kita masih terus mencoba? Karena kesuksesan selalu dimulai dari sebuah percobaan! Komponennya? Di Ichibot Store!",
]

export default function CheckoutReceipt({ order, onClose }: { order: OrderDetails, onClose: () => void }) {
    const [quote, setQuote] = useState('')

    useEffect(() => {
        setQuote(RANDOM_QUOTES[Math.floor(Math.random() * RANDOM_QUOTES.length)])
    }, [])

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white text-black w-full max-w-md shadow-2xl rounded-none animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:max-w-none print:w-auto print:max-h-none print:absolute print:inset-0 print:bg-white">

                {/* Close button - Hidden on print */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors print:hidden z-10"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                {/* Printable Content */}
                <div className="receipt-content bg-white overflow-y-auto" id="printable-receipt">
                    <div className="header">
                        <center>
                            <div className="logo-container">
                                <Image src="/uploads/ichibot-text-logo.png" alt="ICHIBOT Store" width={200} height={80} className="object-contain" />
                            </div>
                        </center>
                        <div style={{ fontWeight: 'bold' }}>
                            <center><b>Electronics and Robotic Store</b></center>
                            <center>Jln. Dworowati no.11 Sleman, Yogyakarta</center>
                            <center><b>www.store.ichibot.id</b></center>
                            <center>0877-6348-4384</center>
                        </div>
                    </div>

                    <ul className="order-details">
                        <li className="order">
                            No Nota: <strong>#{order.number}</strong>
                        </li>
                        <li className="date">
                            Tanggal: <strong>{order.date}</strong>
                        </li>
                        <li className="cashier">
                            Pelanggan: <strong>{order.customerName}</strong>
                        </li>
                        <li className="method">
                            Pembayaran: <strong>{order.paymentMethod}</strong>
                        </li>
                        {order.cashierName && (
                            <li className="cashier">
                                Kasir: <strong>{order.cashierName}</strong>
                            </li>
                        )}
                    </ul>

                    <table>
                        <thead>
                            <tr>
                                <th><center>Produk</center></th>
                                <th style={{ padding: 0 }}>&#10003;</th>
                                <th style={{ padding: 0 }}></th>
                                <th><center>Total</center></th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        <div style={{ fontWeight: 'bold' }}>
                                            {item.quantity} x {formatCurrency(item.price)}
                                        </div>
                                        <div>
                                            {item.name}
                                        </div>
                                        {item.attributes && item.attributes.length > 0 && (
                                            <div style={{ fontStyle: 'italic', marginTop: '1px', color: '#000000ff' }}>
                                                {item.attributes.map((attr: any) => `${attr.name}: ${attr.option}`).join(', ')}
                                            </div>
                                        )}
                                        <div style={{ fontWeight: 'bold', color: '#000000', marginTop: '1px' }}>
                                            SKU: {item.sku || '-'} {item.barcode ? `\u00A0\u00A0•\u00A0\u00A0 ${item.barcode}` : ''}
                                        </div>
                                    </td>
                                    <td style={{ padding: 0 }}>&#9634;</td>
                                    <td style={{ padding: 0 }}></td>
                                    <td>{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colSpan={3}>Total</th>
                                <td>{formatCurrency(order.total)}</td>
                            </tr>
                            {/* Assuming cash payment for now based on previous context, user can handle change logic later if needed */}
                            <tr>
                                <th colSpan={3}>Dibayarkan</th>
                                <td>{formatCurrency(order.total)}</td>
                            </tr>
                            <tr>
                                <th colSpan={3}>Kembalian</th>
                                <td>{formatCurrency(0)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="quote">
                        <b><center><i>"{quote}"</i></center></b>
                    </div>

                    <br />
                    <hr />
                    <div>
                        <center>
                            Terimakasih sudah berbelanja di ICHIBOT Store.<br />
                            Cek katalog dan stock produk di <b><em>www.store.ichibot.id</em></b>
                            <hr />
                            Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan
                            <hr />
                            Instagram : @team.ichibot<br />
                            Tokopedia : ICHIBOT<br />
                            Shopee : ichibot<br />
                            Youtube : ICHIBOT<br />
                            Tiktok : @team.ichibot
                            <hr />
                        </center>
                    </div>
                </div>

                {/* Actions (Not printed) */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3 print:hidden mt-auto">
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-3 px-4 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        Cetak Struk
                    </button>
                </div>
            </div>

            <style jsx global>{`
                /* Base Styles imitating the 10px sans-serif requirement */
                .receipt-content {
                    font-family: sans-serif;
                    font-size: 12px;
                    color: #000;
                    padding: 20px;
                    width: 100%;
                    max-width: 400px; /* Viewport constraint for modal */
                    margin: 0 auto;
                }

                .header {
                    text-align: center;
                    margin-bottom: 10px;
                }

                .logo-container img {
                    max-width: 200px;
                    height: auto;
                }

                .order-details {
                    list-style: none;
                    margin: 0;
                    padding: 5px;
                    margin-bottom: 1px;
                }

                .order-details li {
                    margin-bottom: 0;
                }

                table {
                    border-collapse: collapse !important;
                    width: 100% !important;
                    margin-bottom: 20px;
                }

                table thead tr th,
                table tbody tr td,
                table tfoot tr td {
                    border: none;
                    padding: 5px;
                    text-align: left;
                }

                table thead tr th {
                    border-top: 2px solid #000;
                    font-weight: bold;
                    border-bottom: 2px solid #000;
                }

                table tbody tr td {
                    border-bottom: 1px solid #ddd;
                }

                table tfoot tr th {
                    padding: 5px;
                    text-align: right;
                }

                th:last-child,
                td:last-child {
                    text-align: right;
                }

                hr {
                    border: 0;
                    border-top: 1px solid #000; /* or dashed if preferred */
                    margin: 5px 0;
                }

                .quote {
                    margin: 10px 0;
                }

                /* Print Specific Styles */
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }

                    body * {
                        visibility: hidden;
                    }
                    
                    #printable-receipt, #printable-receipt * {
                        visibility: visible;
                    }

                    #printable-receipt {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 68mm; /* Configured for thermal printer */
                        margin: 0;
                        padding: 0;
                        font-size: 12px;
                        background: white;
                        color: black;
                        overflow: visible;
                    }
                    
                    
                    .receipt-content {
                        max-width: none;
                        width: 68mm;
                        padding: 2mm; /* Small padding safe zone */
                    }

                    /* Ensure background graphics are printed if needed */
                    -webkit-print-color-adjust: exact;
                }
            `}</style>
        </div>
    )
}
