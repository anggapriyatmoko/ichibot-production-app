import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const getBase64ImageFromUrl = async (imageUrl: string) => {
    try {
        const res = await fetch(imageUrl, { mode: 'cors', credentials: 'omit' })
        const blob = await res.blob()
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })
    } catch (e) {
        return new Promise<string>((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'Anonymous'
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                if (!ctx) return reject('No ctx')
                ctx.drawImage(img, 0, 0)
                resolve(canvas.toDataURL('image/png'))
            }
            img.onerror = reject
            img.src = imageUrl
        })
    }
}

const initPdfWithFonts = async () => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    try {
        const fetchAndAddFont = async (url: string, filename: string, style: string) => {
            const res = await fetch(url)
            if (!res.ok) throw new Error(`Failed to fetch font: ${res.statusText}`)
            const blob = await res.blob()
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve((reader.result as string).split(',')[1])
                reader.readAsDataURL(blob)
            })
            doc.addFileToVFS(filename, base64)
            doc.addFont(filename, 'Manrope', style)
        }

        await fetchAndAddFont('/fonts/Manrope-Regular.ttf', 'Manrope-Regular.ttf', 'normal')
        await fetchAndAddFont('/fonts/Manrope-Bold.ttf', 'Manrope-Bold.ttf', 'bold')

        doc.setFont('Manrope')
    } catch (error) {
        console.error('Failed to load local fonts, falling back to standard', error)
        doc.setFont('helvetica') // fallback
    }

    return doc
}

const cleanHtml = (html: string) => {
    if (!html) return '';
    let text = html
        .replace(/<li[^>]*>/gi, '\n\u2022 ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?p[^>]*>/gi, '\n')
        .replace(/<\/?div[^>]*>/gi, '\n')
        .replace(/<[^>]*>?/gm, '') // Strip remaining tags
        .replace(/&nbsp;/ig, ' ')  // Convert non-breaking spaces
        .replace(/&amp;/ig, '&')
        .replace(/&lt;/ig, '<')
        .replace(/&gt;/ig, '>')
        .replace(/\r/g, '')        // Remove carriage returns
        .replace(/^[ \t]+|[ \t]+$/gm, '') // Strip leading/trailing spaces on each line
        .replace(/\n{2,}/g, '\n')  // Collapse multiple newlines into one
        .trim();
    return text || '';
}

export const generateProductPdf = async (item: any, returnBlob = false) => {
    const doc = await initPdfWithFonts()
    let logoBase64: string | null = null
    try {
        logoBase64 = await getBase64ImageFromUrl(window.location.origin + '/uploads/ichibot-text-logo.png')
    } catch (e) { }

    const date = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })

    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()

    const addHeaderFooter = (page: number) => {
        if (logoBase64) {
            const props = doc.getImageProperties(logoBase64)
            const logoHeight = 6
            const logoWidth = (props.width * logoHeight) / props.height
            doc.addImage(logoBase64, 'PNG', 14, 10, logoWidth, logoHeight)
        }
        doc.setFontSize(8)
        doc.setTextColor(102, 102, 102)
        doc.setFont('Manrope', 'normal')
        doc.text('ICHIBOT - Platform Edukasi AI untuk Project IoT', 14, 22)
        doc.text('www.ichibot.id', 14, 26)

        doc.setFontSize(16)
        doc.setTextColor(37, 99, 235)
        doc.setFont('Manrope', 'bold')
        doc.text(`DETAIL PRODUK`, pw - 14, 16, { align: 'right' })

        doc.setFontSize(10)
        doc.setTextColor(102, 102, 102)
        doc.setFont('Manrope', 'normal')
        doc.text(date, pw - 14, 22, { align: 'right' })

        doc.setDrawColor(37, 99, 235)
        doc.setLineWidth(0.5)
        doc.line(14, 30, pw - 14, 30)

        doc.setDrawColor(229, 231, 235)
        doc.setLineWidth(0.2)
        doc.line(14, ph - 15, pw - 14, ph - 15)
        doc.setFontSize(8)
        doc.setTextColor(156, 163, 175)
        doc.text('Dokumen ini dibuat secara otomatis oleh sistem Ichibot.', 14, ph - 10)
        doc.text(`Halaman ${page}`, pw - 14, ph - 10, { align: 'right' })
    }

    addHeaderFooter(1)

    doc.setFontSize(16)
    doc.setTextColor(17, 24, 39)
    doc.setFont('Manrope', 'bold')

    const leftWidth = 70

    let imageBase64 = null
    if (item.image) {
        try {
            imageBase64 = await getBase64ImageFromUrl(item.image)
        } catch (e) { }
    }

    if (imageBase64) {
        doc.setDrawColor(229, 231, 235)
        doc.roundedRect(14, 35, leftWidth, leftWidth, 2, 2)
        const type = imageBase64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'
        doc.addImage(imageBase64, type, 16, 37, leftWidth - 4, leftWidth - 4, undefined, 'FAST')
    } else {
        doc.setDrawColor(229, 231, 235)
        doc.setFillColor(249, 250, 251)
        doc.roundedRect(14, 35, leftWidth, leftWidth, 2, 2, 'FD')
        doc.setFontSize(10)
        doc.setTextColor(156, 163, 175)
        doc.text('Tanpa Gambar', 14 + leftWidth / 2, 35 + leftWidth / 2, { align: 'center', baseline: 'middle' })
    }

    const rightX = 14 + leftWidth + 10

    doc.setFontSize(18)
    doc.setTextColor(17, 24, 39)
    doc.setFont('Manrope', 'bold')
    const titleLines = doc.splitTextToSize(item.name, pw - rightX - 14)
    doc.text(titleLines, rightX, 42)

    let currentY = 42 + (titleLines.length * 7) + 4

    const discount = item.discount || 0
    const hasDiscount = discount > 0 && discount < item.price
    const finalPrice = hasDiscount ? discount : item.price

    const formattedPrice = new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(finalPrice)

    doc.setFontSize(22)
    doc.setTextColor(37, 99, 235)
    doc.text(formattedPrice, rightX, currentY)

    if (hasDiscount) {
        doc.setFontSize(12)
        doc.setTextColor(220, 38, 38)
        const discText = `DISKON ${Math.round((1 - discount / item.price) * 100)}%`
        doc.text(discText, rightX + doc.getTextWidth(formattedPrice) + 4, currentY - 2)

        currentY += 8
        const formattedOriginalPrice = new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
        }).format(item.price)
        doc.setFontSize(12)
        doc.setTextColor(156, 163, 175)
        doc.setFont('Manrope', 'normal')
        doc.text(formattedOriginalPrice, rightX, currentY)
        const w = doc.getTextWidth(formattedOriginalPrice)
        doc.setDrawColor(156, 163, 175)
        doc.line(rightX, currentY - 1, rightX + w, currentY - 1)
    }

    currentY += 10
    if (item.quantity) {
        doc.setFontSize(10)
        doc.setTextColor(107, 114, 128)
        doc.setFont('Manrope', 'normal')
        doc.text(`Qty / Satuan: ${item.quantity}`, rightX, currentY)
    }

    currentY = Math.max(currentY + 10, 35 + leftWidth + 10)

    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.2)
    doc.line(14, currentY, pw - 14, currentY)
    currentY += 10

    doc.setFontSize(12)
    doc.setTextColor(107, 114, 128)
    doc.setFont('Manrope', 'bold')
    doc.text('DESKRIPSI / SPESIFIKASI', 14, currentY)
    currentY += 8

    doc.setFontSize(10)
    doc.setTextColor(55, 65, 81)
    doc.setFont('Manrope', 'normal')

    const rawDesc = cleanHtml(item.description)
    const descLines = doc.splitTextToSize(rawDesc, pw - 28)

    let pageNum = 1

    for (const line of descLines) {
        if (currentY > ph - 25) {
            doc.addPage()
            pageNum++
            addHeaderFooter(pageNum)
            currentY = 35
        }
        doc.text(line, 14, currentY)
        currentY += 5
    }

    const additionalImages = (() => {
        try {
            return item.additionalImages ? JSON.parse(item.additionalImages) : []
        } catch (e) {
            return []
        }
    })()

    if (additionalImages.length > 0) {
        currentY += 10
        if (currentY > ph - 40) {
            doc.addPage()
            pageNum++
            addHeaderFooter(pageNum)
            currentY = 35
        }

        doc.setFontSize(12)
        doc.setTextColor(37, 99, 235)
        doc.setFont('Manrope', 'bold')
        doc.text('LAMPIRAN', 14, currentY)
        doc.setDrawColor(229, 231, 235)
        doc.line(14, currentY + 2, pw - 14, currentY + 2)
        currentY += 10

        const imageChunks = [];
        for (let i = 0; i < additionalImages.length; i += 2) {
            imageChunks.push(additionalImages.slice(i, i + 2));
        }

        const attachWidth = (pw - 28 - 10) / 2
        for (const chunk of imageChunks) {
            if (currentY + attachWidth > ph - 25) {
                doc.addPage()
                pageNum++
                addHeaderFooter(pageNum)
                currentY = 35
            }

            for (let i = 0; i < chunk.length; i++) {
                try {
                    const imgB64 = await getBase64ImageFromUrl(chunk[i])
                    const type = imgB64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'
                    const ix = i === 0 ? 14 : 14 + attachWidth + 10
                    doc.setDrawColor(229, 231, 235)
                    doc.roundedRect(ix, currentY, attachWidth, attachWidth, 2, 2)
                    doc.addImage(imgB64, type, ix + 2, currentY + 2, attachWidth - 4, attachWidth - 4, undefined, 'FAST')
                } catch (e) { }
            }
            currentY += attachWidth + 10
        }
    }

    if (returnBlob) {
        return doc.output('bloburl')
    } else {
        doc.save(`Detail-Produk-${item.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`)
    }
}

export const generatePriceListPdf = async (group: any, items: any[], returnBlob = false) => {
    const doc = await initPdfWithFonts()
    let logoBase64: string | null = null
    try {
        logoBase64 = await getBase64ImageFromUrl(window.location.origin + '/uploads/ichibot-text-logo.png')
    } catch (e) { }

    const date = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })

    const pw = doc.internal.pageSize.getWidth()
    // Fixed column widths: No(15) + Foto(30) + Qty(20) + Harga(35) = 100
    // Desc column cell width = page width - margins(28) - other columns(100)
    const descCellWidth = pw - 28 - 15 - 30 - 20 - 35
    const descColWidth = descCellWidth - 10 // 10 is padding left/right

    const bodyData = items.map((item, index) => {
        const cleanDesc = item.description ? cleanHtml(item.description) : ''
        const fullContent = cleanDesc ? `${item.name}\n${cleanDesc}` : item.name

        // Calculate the ACTUAL height needed for our custom rendering
        // (bold name at fontSize 10 + description at fontSize 9)
        const ptToMm = 0.3528
        const cellPadding = 5

        // Calculate name height (bold, fontSize 10)
        doc.setFont('Manrope', 'bold')
        doc.setFontSize(10)
        const nameLines = doc.splitTextToSize(item.name, descColWidth)
        const nameLineHeight = doc.getLineHeight() * ptToMm
        const nameHeight = nameLines.length * nameLineHeight

        // Calculate description height (normal, fontSize 9)
        let descHeight = 0
        if (cleanDesc) {
            doc.setFont('Manrope', 'normal')
            doc.setFontSize(9)
            const descLines = doc.splitTextToSize(cleanDesc, descColWidth)
            const descLineHeight = doc.getLineHeight() * ptToMm
            descHeight = descLines.length * descLineHeight
        }

        // Total height = name + description + padding top/bottom + extra spacing
        const totalContentHeight = nameHeight + descHeight + (cellPadding * 2) + 6

        return [
            (index + 1).toString(),
            '',
            {
                content: fullContent,
                styles: { minCellHeight: Math.max(30, totalContentHeight) }
            },
            item.quantity || '-',
            {
                content: '', // Price drawn natively
                styles: { minCellHeight: 30 }
            }
        ]
    })

    const itemImages: Record<number, string> = {}

    // Tracking for multi-page rows
    const rowLineOffsets = new Map<number, number>();
    const rowFirstPageDrawn = new Set<number>();

    // Process base64 concurrently
    await Promise.all(items.map(async (item, i) => {
        if (item.image) {
            try {
                itemImages[i] = await getBase64ImageFromUrl(item.image)
            } catch (e) { }
        }
    }))


    // Set global line height for consistent height calculation
    doc.setLineHeightFactor(1.15)

    // Temporary storage for column 2 text lines saved by willDrawCell
    let col2SavedLines: string[] = [];

    autoTable(doc, {
        startY: 35,
        theme: 'plain',
        headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], font: 'Manrope', fontStyle: 'bold', cellPadding: 3 },
        bodyStyles: { font: 'Manrope', valign: 'top', fillColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        styles: {
            cellPadding: 5,
            lineColor: [229, 231, 235],
            lineWidth: { bottom: 0.2 },
            overflow: 'linebreak'
        },
        rowPageBreak: 'auto',
        showHead: 'everyPage',
        head: [['No', 'Foto', 'Nama Barang & Deskripsi', 'Qty', 'Harga']],
        body: bodyData,
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { cellWidth: 30 },
            2: { cellWidth: descCellWidth, fontSize: 10 }, // Fixed width for proper height calc
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'right', cellWidth: 35, fontStyle: 'bold', textColor: [37, 99, 235] }
        },
        willDrawCell: (data) => {
            // Intercept column 2 text: save the lines for this page segment,
            // then suppress autoTable's default rendering.
            // Row height and splitting are already calculated at this point.
            if (data.section === 'body' && data.column.index === 2) {
                col2SavedLines = [...data.cell.text];
                data.cell.text = []; // Prevent default text rendering
            }
        },
        didDrawCell: (data) => {
            const rowIdx = data.row.index
            // isFirstPage: true until column 4 (last col) marks it as rendered.
            // This ensures ALL columns on the same page see the same isFirstPage value.
            const isFirstPage = !rowFirstPageDrawn.has(rowIdx)

            if (data.section === 'body' && data.column.index === 2) {
                const item = items[rowIdx]
                if (!item) return;

                const cell = data.cell
                const padding = data.cell.styles.cellPadding as number || 5
                const textWidth = cell.width - (padding * 2)
                const ptToMm = 0.3528
                const nameLinesOffset = rowLineOffsets.get(rowIdx) || 0

                // Use saved lines from willDrawCell (the lines for THIS page segment)
                const lines = col2SavedLines

                // Calculate where the bold name ends in the FULL content
                const nameOnlyLines = doc.splitTextToSize(item.name, textWidth)
                const nameLinesCount = nameOnlyLines.length

                let currentY = cell.y + padding + 3

                lines.forEach((line, i) => {
                    const absoluteLineIndex = nameLinesOffset + i

                    // Style based on absolute position in the full text
                    if (absoluteLineIndex < nameLinesCount) {
                        doc.setFont('Manrope', 'bold')
                        doc.setFontSize(10)
                        doc.setTextColor(17, 24, 39)
                    } else {
                        doc.setFont('Manrope', 'normal')
                        doc.setFontSize(9)
                        doc.setTextColor(107, 114, 128)
                    }

                    doc.text(line, cell.x + padding, currentY)
                    currentY += doc.getLineHeight() * ptToMm
                })

                // Update offset for the NEXT page of this SAME row
                rowLineOffsets.set(rowIdx, nameLinesOffset + lines.length)
            }

            // Only draw image and price on the FIRST page of a split row
            if (data.section === 'body' && data.column.index === 1 && isFirstPage) {
                const ri = data.row.index
                if (itemImages[ri]) {
                    const cell = data.cell
                    const dim = 24
                    const x = cell.x + (cell.width - dim) / 2
                    const y = cell.y + 3 // Top padding
                    try {
                        const type = itemImages[ri].startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'
                        doc.addImage(itemImages[ri], type, x, y, dim, dim, undefined, 'FAST')
                    } catch (e) { }
                } else {
                    doc.setFontSize(8)
                    doc.setTextColor(156, 163, 175)
                    const cell = data.cell
                    doc.text('Tanpa Gambar', cell.x + cell.width / 2, cell.y + 15, { align: 'center', baseline: 'middle' })
                }
            }

            // Draw Price in Column 4 (Price) - ONLY on the first page of a split row
            if (data.section === 'body' && data.column.index === 4 && isFirstPage) {
                const item = items[data.row.index]
                if (!item) return;
                const discount = item.discount || 0
                const hasDiscount = discount > 0 && discount < item.price
                const finalPrice = hasDiscount ? discount : item.price
                const cell = data.cell
                const padding = data.cell.styles.cellPadding as number || 5

                const formattedPrice = new Intl.NumberFormat('id-ID', {
                    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
                }).format(finalPrice)

                doc.setFont('Manrope', 'bold')
                doc.setFontSize(10)
                doc.setTextColor(37, 99, 235) // Blue-600
                doc.text(formattedPrice, cell.x + cell.width - padding, cell.y + padding + 3.5, { align: 'right' })

                if (hasDiscount) {
                    const formattedOriginalPrice = new Intl.NumberFormat('id-ID', {
                        style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
                    }).format(item.price)

                    doc.setFont('Manrope', 'normal')
                    doc.setFontSize(8)
                    doc.setTextColor(55, 65, 81) // Gray-700
                    const yPosOrig = cell.y + padding + 8.5
                    const xPosOrig = cell.x + cell.width - padding
                    doc.text(formattedOriginalPrice, xPosOrig, yPosOrig, { align: 'right' })

                    // Draw strikethrough
                    const textWidth = doc.getTextWidth(formattedOriginalPrice)
                    doc.setDrawColor(55, 65, 81)
                    doc.setLineWidth(0.2)
                    doc.line(xPosOrig - textWidth, yPosOrig - 0.8, xPosOrig, yPosOrig - 0.8)

                    // Draw Discount Badge below strikethrough
                    const discPercent = Math.round((1 - item.discount / item.price) * 100)
                    const badgeText = `DISC ${discPercent}%`

                    doc.setFontSize(8)
                    doc.setTextColor(255, 255, 255)
                    doc.setFont('Manrope', 'bold')

                    const badgeWidth = doc.getTextWidth(badgeText) + 3
                    const badgeHeight = 5
                    const bx = xPosOrig - badgeWidth
                    const by = yPosOrig + 2

                    doc.setFillColor(220, 38, 38) // Red-600
                    doc.roundedRect(bx, by, badgeWidth, badgeHeight, 0.5, 0.5, 'F')
                    doc.text(badgeText, bx + 1.5, by + 3.8)
                }
            }

            // Mark row as rendered AFTER the last column (4) is processed.
            // This ensures all columns on the same page see consistent isFirstPage.
            if (data.section === 'body' && data.column.index === 4) {
                rowFirstPageDrawn.add(rowIdx)
            }
        },
        didDrawPage: (data) => {
            if (logoBase64) {
                const props = doc.getImageProperties(logoBase64)
                const logoHeight = 6
                const logoWidth = (props.width * logoHeight) / props.height
                doc.addImage(logoBase64, 'PNG', 14, 10, logoWidth, logoHeight)
            }
            doc.setFontSize(8)
            doc.setTextColor(102, 102, 102)
            doc.setFont('Manrope', 'normal')
            doc.text('ICHIBOT - Platform Edukasi AI untuk Project IoT', 14, 22)
            doc.text('www.ichibot.id', 14, 26)

            doc.setFontSize(14)
            doc.setTextColor(37, 99, 235)
            doc.setFont('Manrope', 'bold')
            doc.text('DAFTAR HARGA', pw - 14, 16, { align: 'right' })

            doc.setFontSize(12)
            doc.setTextColor(17, 24, 39)
            doc.text(group.name.toUpperCase(), pw - 14, 22, { align: 'right' })

            doc.setFontSize(10)
            doc.setTextColor(102, 102, 102)
            doc.setFont('Manrope', 'normal')
            doc.text(date, pw - 14, 27, { align: 'right' })

            const pageHeight = doc.internal.pageSize.getHeight()
            doc.setDrawColor(229, 231, 235)
            doc.setLineWidth(0.2)
            doc.line(14, pageHeight - 15, pw - 14, pageHeight - 15)
            doc.setFontSize(8)
            doc.setTextColor(156, 163, 175)
            doc.text('Dokumen ini dibuat secara otomatis oleh sistem Ichibot.', 14, pageHeight - 10)
            const str = 'Halaman ' + doc.getNumberOfPages()
            doc.text(str, pw - 14, pageHeight - 10, { align: 'right' })
        },
        margin: { top: 35, bottom: 20 }
    })

    if (returnBlob) {
        return doc.output('bloburl')
    } else {
        doc.save(`Daftar-Harga-${group.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`)
    }
}
