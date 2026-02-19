import jsPDF from 'jspdf'
import { toPng } from 'html-to-image'

const waitForImages = async (container: HTMLElement) => {
    const images = Array.from(container.getElementsByTagName('img'))
    await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise(resolve => {
            img.onload = resolve
            img.onerror = resolve
        })
    }))
}

export const generateProductPdf = async (item: any, returnBlob = false) => {
    // Create a temporary container for the PDF content
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '210mm'
    container.style.minHeight = '297mm'
    container.style.backgroundColor = '#ffffff'
    container.style.padding = '20mm'
    container.style.fontFamily = 'Arial, sans-serif'
    container.style.boxSizing = 'border-box'
    container.style.zIndex = '-9999'

    // Format Prices
    const discount = item.discount || 0
    const hasDiscount = discount > 0 && discount < item.price
    const finalPrice = hasDiscount ? discount : item.price

    const formattedPrice = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(finalPrice)

    const formattedOriginalPrice = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(item.price)

    // Current Date
    const date = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })

    // Process additional images
    const additionalImages = (() => {
        try {
            return item.additionalImages ? JSON.parse(item.additionalImages) : []
        } catch (e) {
            return []
        }
    })()

    // Chunk images into pairs for 2-column layout
    const imageChunks = [];
    for (let i = 0; i < additionalImages.length; i += 2) {
        imageChunks.push(additionalImages.slice(i, i + 2));
    }

    // Process Description: Split into paragraphs for better pagination
    const parser = new DOMParser()
    const descDoc = parser.parseFromString(item.description || '<p>Tidak ada deskripsi tersedia.</p>', 'text/html')
    const descNodes = Array.from(descDoc.body.childNodes)

    // We convert nodes back to HTML strings, wrapping each in a div to be a pagination block
    const descBlocks = descNodes.map(node => {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) return ''
        const el = node as HTMLElement
        return node.nodeType === Node.ELEMENT_NODE
            ? el.outerHTML
            : `<div>${node.textContent}</div>`
    }).filter(Boolean)

    // Main Product Content (Header + Details)
    const mainContentHtml = `
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px;">
                <div style="white-space: nowrap;">
                    <img src="${window.location.origin}/uploads/ichibot-text-logo.png" alt="Ichibot" style="height: 50px; object-fit: contain;" />
                    <div style="margin-top: 5px; font-size: 12px; color: #666; white-space: nowrap;">
                        ICHIBOT - Platform Edukasi AI untuk Project IoT<br/>
                        www.ichibot.id
                    </div>
                </div>
                <div style="text-align: right;">
                    <h1 style="margin: 0; color: #2563eb; font-size: 24px;">DETAIL PRODUK</h1>
                    <p style="margin: 5px 0 0; color: #666; font-size: 14px;">${date}</p>
                </div>
            </div>

            <!-- Content -->
            <div style="display: flex; gap: 30px; flex-grow: 1;">
                <!-- Left: Image -->
                <div style="width: 40%;">
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; padding: 10px; background-color: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 200px;">
                        ${item.image
            ? `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: auto; object-fit: cover; display: block;" />`
            : `<div style="text-align: center; color: #9ca3af;">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                                </svg>
                                <div style="margin-top: 8px; font-size: 12px;">Tanpa Gambar</div>
                               </div>`
        }
                    </div>
                </div>

                <!-- Right: Details -->
                <div style="width: 60%;">
                    <h2 style="margin: 0 0 10px; font-size: 22px; color: #111827;">${item.name}</h2>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 28px; font-weight: bold; color: #2563eb;">${formattedPrice}</span>
                            ${hasDiscount ? `
                                <span style="display: inline-flex; align-items: center; background-color: #fee2e2; color: #dc2626; font-size: 12px; font-weight: bold; padding: 2px 8px; border-radius: 4px; border: 1px solid #fecaca;">
                                    DISKON ${Math.round((1 - discount / item.price) * 100)}%
                                </span>
                            ` : ''}
                        </div>
                        
                        ${hasDiscount ? `
                            <div style="font-size: 16px; text-decoration: line-through; color: #9ca3af; margin-top: 4px;">
                                ${formattedOriginalPrice}
                            </div>
                        ` : ''}

                        ${item.quantity ? `<div style="font-size: 14px; color: #6b7280; margin-top: 8px;">Qty / Satuan: ${item.quantity}</div>` : ''}
                    </div>
                </div>
            </div>
    `

    // Wrapper for Main Content
    container.innerHTML = `
        <style>
            .pdf-container { width: 100%; display: flex; flex-direction: column; }
            .pdf-block { margin-bottom: 10px; }
            .pdf-header { margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .pdf-main-info { display: flex; gap: 30px; margin-bottom: 20px; }
            .pdf-attachment-row { display: flex; gap: 20px; margin-bottom: 20px; }
            .pdf-attachment-item { flex: 1; border: 1px solid #e5e7eb; padding: 10px; border-radius: 8px; }
            p { margin: 0 0 4px 0; line-height: 1.3; text-align: justify; }
            ul, ol { margin: 0 0 8px 0; padding-left: 20px; }
            li { margin-bottom: 4px; }
        </style>
        <div class="pdf-container">
            <div class="pdf-block pdf-main-content">
                ${mainContentHtml}
            </div>

            <!-- Description Title (Block) -->
            <div class="pdf-block" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <h3 style="margin: 0 0 10px; font-size: 14px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">Deskripsi / Spesifikasi</h3>
            </div>

            <!-- Description Blocks (Paragraphs) -->
            <div class="pdf-description-container" style="font-size: 14px; color: #374151;">
                ${descBlocks.map(blockHtml => `<div class="pdf-block">${blockHtml}</div>`).join('')}
            </div>

            ${imageChunks.length > 0 ? `
                <div class="pdf-block pdf-attachments-title" style="margin-top: 40px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #2563eb; font-size: 18px; text-transform: uppercase;">LAMPIRAN</h2>
                </div>
                ${imageChunks.map((chunk) => `
                    <div class="pdf-block pdf-attachment-row">
                        ${chunk.map((img: string) => `
                            <div class="pdf-attachment-item">
                                <img src="${img}" style="width: 100%; height: auto; display: block;" />
                            </div>
                        `).join('')}
                        ${chunk.length === 1 ? '<div class="pdf-attachment-item" style="border: none;"></div>' : ''}
                    </div>
                `).join('')}
            ` : ''}
        </div>
    `

    document.body.appendChild(container)

    try {
        await waitForImages(container)

        // Calculate Pagination
        const pageHeightPx = (297 * 96) / 25.4 // A4 height in pixels ~1122px
        const marginT = (20 * 96) / 25.4
        const marginB = (20 * 96) / 25.4 // space for footer

        const containerRect = container.getBoundingClientRect() // Fixed container
        const contentContainer = container.querySelector('.pdf-container')!

        const blocks = Array.from(contentContainer.querySelectorAll('.pdf-block'))

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i] as HTMLElement;
            const blockRect = block.getBoundingClientRect()
            const blockTop = blockRect.top - containerRect.top
            const blockHeight = blockRect.height
            const blockBottom = blockTop + blockHeight

            // Check if this block crosses a page boundary
            const pageIndex = Math.floor(blockTop / pageHeightPx)
            const pageBottomLimit = ((pageIndex + 1) * pageHeightPx) - marginB

            // Special Force Break for Attachments
            const isAttachmentTitle = block.classList.contains('pdf-attachments-title')
            const blockTopInPage = blockTop % pageHeightPx
            const isAtTop = blockTopInPage < (marginT + 50)
            const forceBreak = isAttachmentTitle && !isAtTop

            if (blockBottom > pageBottomLimit || forceBreak) {
                const nextPageTop = (pageIndex + 1) * pageHeightPx + marginT
                const gap = nextPageTop - blockTop

                const spacer = document.createElement('div')
                spacer.style.height = `${gap}px`
                spacer.style.width = '100%'
                block.parentNode?.insertBefore(spacer, block)
            }
        }

        const dataUrl = await toPng(container, {
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: true
        })

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        })

        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm
        const imgProps = pdf.getImageProperties(dataUrl)
        const totalHeightMm = (imgProps.height * pdfWidth) / imgProps.width

        let position = 0
        let pageNum = 1
        const totalPages = Math.ceil(totalHeightMm / pdfHeight)

        while (position < totalHeightMm) {
            if (pageNum > 1) pdf.addPage()

            // addImage(imageData, format, x, y, w, h)
            pdf.addImage(dataUrl, 'PNG', 0, -position, pdfWidth, totalHeightMm)

            // White Cover for Footer Area (Bottom 20mm) - optional but cleaner
            pdf.setFillColor(255, 255, 255)
            pdf.rect(0, 280, 210, 20, 'F')

            // Footer
            pdf.setFontSize(8)
            pdf.setTextColor(156, 163, 175) // #9ca3af
            pdf.setDrawColor(229, 231, 235) // #e5e7eb
            pdf.line(20, 285, 190, 285)
            pdf.text('Dokumen ini dibuat secara otomatis oleh sistem Ichibot.', 20, 290)
            pdf.text(`Halaman ${pageNum} dari ${totalPages}`, 190, 290, { align: 'right' })

            position += pdfHeight
            pageNum++
        }

        if (returnBlob) {
            return pdf.output('bloburl')
        } else {
            pdf.save(`Detail-Produk-${item.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`)
        }

    } catch (error) {
        console.error('Error generating PDF:', error)
        throw error
    } finally {
        if (container.parentNode) {
            document.body.removeChild(container)
        }
    }
}

export const generatePriceListPdf = async (group: any, items: any[], returnBlob = false) => {
    // 1. Setup the beautiful container
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '210mm'
    container.style.backgroundColor = '#ffffff'
    container.style.padding = '20mm'
    container.style.fontFamily = 'Arial, sans-serif'
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.boxSizing = 'border-box'
    container.style.zIndex = '-9999'

    const date = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })

    const rows = items.map((item, index) => {
        const discount = item.discount || 0
        const hasDiscount = discount > 0 && discount < item.price
        const finalPrice = hasDiscount ? discount : item.price

        const formattedPrice = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(finalPrice)

        const formattedOriginalPrice = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(item.price)



        return `
            <tr class="product-row" style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; text-align: center; width: 5%; vertical-align: top;">${index + 1}</td>
                <td style="padding: 10px; width: 15%; vertical-align: top;">
                    <div style="border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; background-color: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 50px;">
                        ${item.image
                ? `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: auto; object-fit: contain; display: block;" />`
                : `<div style="text-align: center; color: #9ca3af;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                                </svg>
                               </div>`
            }
                    </div>
                </td>
                <td style="padding: 10px; width: 45%; vertical-align: top;">
                    <div style="font-weight: bold; color: #111827; margin-bottom: 4px;">${item.name}</div>
                    ${item.description ? `<div class="pdf-description" style="font-size: 10px; color: #4b5563; line-height: 1.4;">${item.description}</div>` : ''}
                </td>
                <td style="padding: 10px; width: 10%; text-align: center; vertical-align: top;">${item.quantity || '-'}</td>
                <td style="padding: 10px; width: 25%; text-align: right; vertical-align: top;">
                    <div style="font-weight: bold; color: #2563eb;">
                        ${hasDiscount ? `
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <span>${formattedPrice}</span>
                                    <span style="display: inline-block; background-color: #fee2e2; color: #dc2626; font-size: 7px; font-weight: bold; padding: 1px 3px; border-radius: 2px; border: 1px solid #fecaca;">
                                        ${Math.round((1 - item.discount / item.price) * 100)}%
                                    </span>
                                </div>
                                <div style="font-size: 8px; color: #9ca3af; text-decoration: line-through;">${formattedOriginalPrice}</div>
                            </div>
                        ` : formattedPrice}
                    </div>
                </td>
            </tr>
        `
    }).join('')

    container.innerHTML = `
        <style>
            .pdf-container { width: 100%; display: flex; flex-direction: column; }
            .pdf-description p { margin: 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px; }
            th { background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb; padding: 12px; }
        </style>
        <div class="pdf-container">
            <!-- Header Page 1 -->
            <div id="pdf-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
                <div style="white-space: nowrap;">
                    <img src="${window.location.origin}/uploads/ichibot-text-logo.png" alt="Ichibot" style="height: 40px; object-fit: contain;" />
                    <div style="margin-top: 5px; font-size: 10px; color: #666; white-space: nowrap;">
                        ICHIBOT - Platform Edukasi AI untuk Project IoT<br/>
                        www.ichibot.id
                    </div>
                </div>
                <div style="text-align: right;">
                    <h1 style="margin: 0; color: #2563eb; font-size: 18px; text-transform: uppercase;">DAFTAR HARGA: ${group.name}</h1>
                    <p style="margin: 5px 0 0; color: #666; font-size: 12px;">${date}</p>
                </div>
            </div>

            <div style="flex-grow: 1;">
                <table id="main-table">
                    <thead>
                        <tr class="table-header-row">
                            <th style="text-align: center; width: 5%;">No</th>
                            <th style="text-align: left; width: 15%;">Foto</th>
                            <th style="text-align: left; width: 45%;">Nama Barang & Deskripsi</th>
                            <th style="text-align: center; width: 10%;">Qty</th>
                            <th style="text-align: right; width: 25%;">Harga</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        </div>
    `

    document.body.appendChild(container)
    await waitForImages(container)

    // Helper for sub-headers on Page 2+
    const createSubHeaderHtml = () => `
        <div class="repeated-header" style="padding-top: 30mm; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="font-size: 12px; color: #3b82f6; font-weight: bold; text-transform: uppercase;">
                Daftar Harga: ${group.name} (Lanjutan)
            </div>
            <img src="${window.location.origin}/uploads/ichibot-text-logo.png" alt="Ichibot" style="height: 20px; object-fit: contain;" />
        </div>
    `;

    const createTableHeaderHtml = () => `
        <tr class="repeated-table-header" style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 12px; text-align: center; width: 5%; font-size: 12px;">No</th>
            <th style="padding: 12px; text-align: left; width: 15%; font-size: 12px;">Foto</th>
            <th style="padding: 12px; text-align: left; width: 45%; font-size: 12px;">Nama Barang & Deskripsi</th>
            <th style="padding: 12px; text-align: center; width: 10%; font-size: 12px;">Qty</th>
            <th style="padding: 12px; text-align: right; width: 25%; font-size: 12px;">Harga</th>
        </tr>
    `;

    // 2. Smart Spacers & Repeating Headers Logic
    const pageHeightPx = (297 * 96) / 25.4 // A4 height in pixels
    const tbody = container.querySelector('tbody')!
    const trs = Array.from(tbody.querySelectorAll('.product-row'))
    const containerTop = container.getBoundingClientRect().top

    for (let i = 0; i < trs.length; i++) {
        const tr = trs[i] as HTMLElement;
        const rect = tr.getBoundingClientRect()
        const trTop = rect.top - containerTop
        const trHeight = rect.height
        const trBottom = trTop + trHeight

        const pageOfTop = Math.floor(trTop / pageHeightPx)
        const pageOfBottom = Math.floor((trBottom + 10) / pageHeightPx)

        if (pageOfTop !== pageOfBottom) {
            const nextBoundary = (pageOfTop + 1) * pageHeightPx
            const gap = nextBoundary - trTop

            // 1. Insert Spacer to push row to next page
            const spacer = document.createElement('tr')
            spacer.innerHTML = `<td colspan="5" style="height: ${gap}px; border: none;"></td>`
            tbody.insertBefore(spacer, tr)

            // 2. Insert Repeating Header (on Page 2+)
            // We use a div for the sub-header but we need to wrap it or use a row
            // Actually, inserting a sub-header outside the table or using a special row is tricky.
            // Let's use a special "header-row" inside the table for simplicity.

            const headerRow = document.createElement('tr')
            headerRow.innerHTML = `
                <td colspan="5" style="padding: 0; border: none;">
                    ${createSubHeaderHtml()}
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            ${createTableHeaderHtml()}
                        </thead>
                    </table>
                </td>
            `
            tbody.insertBefore(headerRow, tr)
        }
    }

    try {
        const dataUrl = await toPng(container, {
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: true
        })

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        })

        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()
        const imgProps = pdf.getImageProperties(dataUrl)
        const totalHeightMm = (imgProps.height * pdfWidth) / imgProps.width

        let position = 0
        let pageNum = 1
        const totalPages = Math.ceil(totalHeightMm / pdfHeight)

        while (position < totalHeightMm) {
            if (pageNum > 1) pdf.addPage()

            pdf.addImage(dataUrl, 'PNG', 0, - (pageNum - 1) * pdfHeight, pdfWidth, totalHeightMm)

            // White Cover for Footer Area
            pdf.setFillColor(255, 255, 255)
            pdf.rect(0, 280, 210, 20, 'F')

            // Footer
            pdf.setFontSize(8)
            pdf.setTextColor(156, 163, 175)
            pdf.setDrawColor(229, 231, 235)
            pdf.line(20, 285, 190, 285)
            pdf.text('Dokumen ini dibuat secara otomatis oleh sistem Ichibot.', 20, 290)
            pdf.text(`Halaman ${pageNum} dari ${totalPages}`, 190, 290, { align: 'right' })

            position += pdfHeight
            pageNum++
        }

        if (returnBlob) {
            return pdf.output('bloburl')
        } else {
            pdf.save(`Daftar-Harga-${group.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`)
        }

    } catch (error) {
        console.error('Error generating PDF:', error)
        throw error
    } finally {
        if (container.parentNode) {
            document.body.removeChild(container)
        }
    }
}
