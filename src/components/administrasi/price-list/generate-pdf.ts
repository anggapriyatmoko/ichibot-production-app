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

const addImageWithAspectRatio = (doc: any, imgData: string, type: string, x: number, y: number, maxW: number, maxH: number, center = true) => {
    try {
        const props = doc.getImageProperties(imgData)
        const ratio = props.width / props.height
        let targetW = maxW
        let targetH = targetW / ratio

        if (targetH > maxH) {
            targetH = maxH
            targetW = targetH * ratio
        }

        const finalX = center ? x + (maxW - targetW) / 2 : x
        const finalY = center ? y + (maxH - targetH) / 2 : y

        doc.addImage(imgData, type, finalX, finalY, targetW, targetH, undefined, 'FAST')
        return { x: finalX, y: finalY, width: targetW, height: targetH }
    } catch (e) {
        doc.addImage(imgData, type, x, y, maxW, maxH, undefined, 'FAST')
        return { x, y, width: maxW, height: maxH }
    }
}

const initPdfWithFonts = async () => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [210, 330]
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

const renderProductDetail = async (doc: any, item: any, currentY: number, pw: number, ph: number, sequenceNumber?: number) => {
    const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(val)

    const checkPageBreak = (neededHeight: number, y: number): number => {
        if (y + neededHeight > ph - 25) {
            doc.addPage()
            // We don't call addHeaderFooter here because it should be handled by the caller or a global listener
            // But in the existing code, it was called manually. 
            // I'll assume the caller provides a way to add header/footer on new page if needed, 
            // OR I'll pass the addHeaderFooter function.
            // Let's pass it.
            return 35
        }
        return y
    }

    // ==========================================
    // SECTION 1: Product Name (full width, above image)
    // ==========================================
    doc.setFontSize(18)
    doc.setTextColor(17, 24, 39)
    doc.setFont('Manrope', 'bold')

    const displayTitle = sequenceNumber ? `${sequenceNumber}. ${item.name}` : item.name
    const titleLines = doc.splitTextToSize(displayTitle, pw - 28)

    // Ensure title fits on page or starts on new page
    if (currentY + (titleLines.length * 6) > ph - 40) {
        doc.addPage()
        currentY = 35
    }

    doc.text(titleLines, 14, currentY + 5)
    currentY += 5 + (titleLines.length * 6)

    // ==========================================
    // SECTION 2: Image (left) + Deskripsi Singkat (right)
    // ==========================================
    const leftWidth = 70
    const imageStartY = currentY
    let imageBase64 = null
    if (item.image) {
        try {
            imageBase64 = await getBase64ImageFromUrl(item.image)
        } catch (e) { }
    }

    let actualImageHeight = 0
    let actualImageWidth = 0
    if (imageBase64) {
        const type = imageBase64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'
        const dims = addImageWithAspectRatio(doc, imageBase64, type, 14, imageStartY, leftWidth, leftWidth, false)
        actualImageHeight = dims.height
        actualImageWidth = dims.width
    } else {
        actualImageHeight = 20
        actualImageWidth = 0
        doc.setFontSize(10)
        doc.setTextColor(156, 163, 175)
        doc.text('Tanpa Gambar', 14 + leftWidth / 2, imageStartY + actualImageHeight / 2, { align: 'center', baseline: 'middle' })
    }

    const imageGap = 6
    const rightX = 14 + (actualImageWidth || leftWidth) + imageGap
    const rightWidth = pw - rightX - 14

    let textY = imageStartY + 2

    const rawShortDesc = cleanHtml(item.shortDescription).replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim()
    if (rawShortDesc) {
        doc.setFontSize(10)
        doc.setTextColor(107, 114, 128)
        doc.setFont('Manrope', 'bold')
        doc.text('Deskripsi Singkat', rightX, textY)
        textY += 6

        doc.setFontSize(10)
        doc.setTextColor(107, 114, 128)
        doc.setFont('Manrope', 'normal')

        const shortDescLines = doc.splitTextToSize(rawShortDesc, rightWidth)
        const imageBottomY = imageStartY + actualImageHeight + imageGap
        let overflowStartIndex = -1

        for (let i = 0; i < shortDescLines.length; i++) {
            if (textY < imageBottomY) {
                doc.text(shortDescLines[i], rightX, textY)
                textY += 5
            } else {
                overflowStartIndex = i
                break
            }
        }

        if (overflowStartIndex >= 0) {
            textY = imageBottomY + imageGap
            const remainingText = shortDescLines.slice(overflowStartIndex).join(' ')
            const fullWidthLines = doc.splitTextToSize(remainingText, pw - 28)
            for (const line of fullWidthLines) {
                if (textY + 6 > ph - 25) {
                    doc.addPage()
                    textY = 35
                }
                doc.text(line, 14, textY)
                textY += 5
            }
        }
        textY += 2
    }

    const prices = item.prices && item.prices.length > 0 ? item.prices : null
    if (!prices) {
        const discount = item.discount || 0
        const hasDiscount = discount > 0 && discount < item.price
        const finalPrice = hasDiscount ? discount : item.price

        doc.setFontSize(22)
        doc.setTextColor(37, 99, 235)
        doc.text(formatRupiah(finalPrice), rightX, textY)

        if (hasDiscount) {
            doc.setFontSize(12)
            doc.setTextColor(220, 38, 38)
            const discText = `DISKON ${Math.round((1 - discount / item.price) * 100)}%`
            doc.text(discText, rightX + doc.getTextWidth(formatRupiah(finalPrice)) + 4, textY - 2)

            textY += 8
            doc.setFontSize(12)
            doc.setTextColor(156, 163, 175)
            doc.setFont('Manrope', 'normal')
            const origPrice = formatRupiah(item.price)
            doc.text(origPrice, rightX, textY)
            const w = doc.getTextWidth(origPrice)
            doc.setDrawColor(156, 163, 175)
            doc.line(rightX, textY - 1, rightX + w, textY - 1)
        }

        textY += 10
        if (item.quantity) {
            doc.setFontSize(10)
            doc.setTextColor(107, 114, 128)
            doc.setFont('Manrope', 'normal')
            doc.text(`Qty / Satuan: ${item.quantity}`, rightX, textY)
        }
    }

    currentY = Math.max(textY + 0.5, imageStartY + actualImageHeight + 0.5)

    // ==========================================
    // SECTION 3: Deskripsi / Keterangan (2 columns, rich text)
    // ==========================================
    if (item.description && item.description.trim()) {
        currentY += 0.5
        if (currentY + 20 > ph - 25) {
            doc.addPage()
            currentY = 35
        }

        doc.setDrawColor(229, 231, 235)
        doc.setLineWidth(0.2)
        doc.line(14, currentY, pw - 14, currentY)
        currentY += 5

        type RichSegment = { text: string; bold: boolean; italic: boolean }
        type RichLine = RichSegment[]

        const parseHtmlToRichLines = (html: string): RichLine[] => {
            const lines: RichLine[] = []
            let currentLine: RichSegment[] = []

            const blocks = html
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<\/div>/gi, '\n')
                .replace(/<li[^>]*>/gi, '\n• ')
                .replace(/<\/li>/gi, '')
                .replace(/<\/?ul[^>]*>/gi, '')
                .replace(/<\/?ol[^>]*>/gi, '')
                .replace(/<p[^>]*>/gi, '')
                .replace(/<div[^>]*>/gi, '')

            const processInline = (text: string, inheritBold: boolean, inheritItalic: boolean) => {
                let remaining = text
                while (remaining.length > 0) {
                    const boldMatch = remaining.match(/<(b|strong)>/i)
                    const italicMatch = remaining.match(/<(i|em)>/i)

                    let nextTag: { index: number; tag: string; type: 'bold' | 'italic' } | null = null
                    if (boldMatch && boldMatch.index !== undefined) {
                        nextTag = { index: boldMatch.index, tag: boldMatch[0], type: 'bold' }
                    }
                    if (italicMatch && italicMatch.index !== undefined) {
                        if (!nextTag || italicMatch.index < nextTag.index) {
                            nextTag = { index: italicMatch.index, tag: italicMatch[0], type: 'italic' }
                        }
                    }

                    if (!nextTag) {
                        const clean = remaining.replace(/<[^>]*>/g, '').replace(/&nbsp;/ig, ' ').replace(/&amp;/ig, '&').replace(/&lt;/ig, '<').replace(/&gt;/ig, '>')
                        if (clean) {
                            currentLine.push({ text: clean, bold: inheritBold, italic: inheritItalic })
                        }
                        break
                    }

                    const before = remaining.substring(0, nextTag.index).replace(/<[^>]*>/g, '').replace(/&nbsp;/ig, ' ').replace(/&amp;/ig, '&')
                    if (before) {
                        currentLine.push({ text: before, bold: inheritBold, italic: inheritItalic })
                    }

                    const closingTag = nextTag.type === 'bold' ? /<\/(b|strong)>/i : /<\/(i|em)>/i
                    const afterOpen = remaining.substring(nextTag.index + nextTag.tag.length)
                    const closeMatch = afterOpen.match(closingTag)

                    if (closeMatch && closeMatch.index !== undefined) {
                        const innerContent = afterOpen.substring(0, closeMatch.index)
                        const newBold = nextTag.type === 'bold' ? true : inheritBold
                        const newItalic = nextTag.type === 'italic' ? true : inheritItalic
                        processInline(innerContent, newBold, newItalic)
                        remaining = afterOpen.substring(closeMatch.index + closeMatch[0].length)
                    } else {
                        const newBold = nextTag.type === 'bold' ? true : inheritBold
                        const newItalic = nextTag.type === 'italic' ? true : inheritItalic
                        processInline(afterOpen, newBold, newItalic)
                        break
                    }
                }
            }

            const rawLines = blocks.split('\n')
            for (const rawLine of rawLines) {
                currentLine = []
                processInline(rawLine, false, false)
                if (currentLine.length > 0 || lines.length > 0) {
                    lines.push(currentLine.length > 0 ? currentLine : [{ text: '', bold: false, italic: false }])
                }
            }

            while (lines.length > 0 && lines[lines.length - 1].length === 1 && lines[lines.length - 1][0].text === '') {
                lines.pop()
            }

            return lines
        }

        const richLines = parseHtmlToRichLines(item.description)

        const colGap = 8
        const colWidth = (pw - 28 - colGap) / 2
        const midPoint = Math.ceil(richLines.length / 2)
        const col1Lines = richLines.slice(0, midPoint)
        const col2Lines = richLines.slice(midPoint)

        const col1X = 14
        const col2X = 14 + colWidth + colGap

        const renderRichLine = (segments: RichSegment[], x: number, y: number, maxWidth: number): number => {
            doc.setFontSize(10)
            doc.setTextColor(107, 114, 128)

            if (segments.length === 1 && segments[0].text === '') {
                return y + 5
            }

            let curX = x
            for (const seg of segments) {
                if (!seg.text) continue

                const fontStyle = seg.bold ? 'bold' : 'normal'
                doc.setFont('Manrope', fontStyle)

                const words = seg.text.split(' ')
                for (const word of words) {
                    if (!word) continue
                    const wordWidth = doc.getTextWidth(word + ' ')
                    if (curX + wordWidth > x + maxWidth && curX > x) {
                        y += 5
                        if (y + 6 > ph - 25) {
                            doc.addPage()
                            y = 35
                        }
                        curX = x
                    }
                    doc.text(word, curX, y)
                    curX += wordWidth
                }
            }
            return y + 5
        }

        const startDescY = currentY

        let col1Y = startDescY
        for (const line of col1Lines) {
            if (col1Y + 6 > ph - 25) {
                doc.addPage()
                col1Y = 35
            }
            col1Y = renderRichLine(line, col1X, col1Y, colWidth)
        }

        let col2Y = startDescY
        for (const line of col2Lines) {
            if (col2Y + 6 > ph - 25) {
                doc.addPage()
                col2Y = 35
            }
            col2Y = renderRichLine(line, col2X, col2Y, colWidth)
        }

        currentY = Math.max(col1Y, col2Y)
    }

    // ==========================================
    // SECTION 4: Variant Prices (dynamic columns)
    // ==========================================
    if (prices && prices.length > 0) {
        currentY += 0.5
        if (currentY + 30 > ph - 25) {
            doc.addPage()
            currentY = 35
        }

        doc.setDrawColor(229, 231, 235)
        doc.setLineWidth(0.2)
        doc.line(14, currentY, pw - 14, currentY)
        currentY += 5
        currentY += 2

        const numCols = Math.min(prices.length, 4)
        const colGap = 6
        const totalGap = colGap * (numCols - 1)
        const colW = (pw - 28 - totalGap) / numCols

        const cardPad = 3
        const calcCardHeight = (p: any) => {
            let h = cardPad
            h += 4
            h += 8
            const hasDisc = p.discount > 0 && p.discount < p.price
            if (hasDisc) h += 5
            if (p.qty) h += 5
            if (p.description) {
                doc.setFontSize(8)
                doc.setFont('Manrope', 'normal')
                const descLines = doc.splitTextToSize(p.description, colW - 8)
                h += 0.5 + descLines.length * 4
            }
            h += 2
            return h
        }

        for (let i = 0; i < prices.length; i++) {
            const p = prices[i]
            const colIndex = i % numCols
            const colX = 14 + colIndex * (colW + colGap)

            let rowMaxH = 20
            for (let j = i - colIndex; j < Math.min(i - colIndex + numCols, prices.length); j++) {
                rowMaxH = Math.max(rowMaxH, calcCardHeight(prices[j]))
            }

            if (i > 0 && colIndex === 0) {
                currentY += rowMaxH + 4
                if (currentY + rowMaxH + 4 > ph - 25) {
                    doc.addPage()
                    currentY = 35
                }
            }

            const cardY = currentY

            doc.setFillColor(245, 247, 250)
            doc.setDrawColor(229, 231, 235)
            doc.roundedRect(colX, cardY, colW, rowMaxH, 2, 2, 'FD')

            doc.setFontSize(9)
            doc.setTextColor(107, 114, 128)
            doc.setFont('Manrope', 'bold')
            const labelText = doc.splitTextToSize(p.label || `Varian ${i + 1}`, colW - 8)
            doc.text(labelText, colX + 4, cardY + 5)

            const hasDiscount = p.discount > 0 && p.discount < p.price
            const finalPrice = hasDiscount ? p.discount : p.price

            doc.setFontSize(14)
            doc.setTextColor(37, 99, 235)
            doc.setFont('Manrope', 'bold')
            const priceText = formatRupiah(finalPrice)
            doc.text(priceText, colX + 4, cardY + 12)

            let contentY = cardY + 14

            if (hasDiscount) {
                doc.setFontSize(9)
                doc.setTextColor(156, 163, 175)
                doc.setFont('Manrope', 'normal')
                const origText = formatRupiah(p.price)
                doc.text(origText, colX + 4, contentY + 3)
                const tw = doc.getTextWidth(origText)
                doc.setDrawColor(156, 163, 175)
                doc.line(colX + 4, contentY + 2, colX + 4 + tw, contentY + 2)

                const discPercent = Math.round((1 - p.discount / p.price) * 100)
                const badgeText = `DISC ${discPercent}%`
                doc.setFontSize(7)
                doc.setTextColor(255, 255, 255)
                doc.setFont('Manrope', 'bold')
                const bw = doc.getTextWidth(badgeText) + 3
                doc.setFillColor(220, 38, 38)
                doc.roundedRect(colX + 4 + tw + 2, contentY, bw, 4, 0.5, 0.5, 'F')
                doc.text(badgeText, colX + 4 + tw + 3.5, contentY + 3)
                contentY += 6
            }

            if (p.qty) {
                contentY += 2
                doc.setFontSize(8)
                doc.setTextColor(107, 114, 128)
                doc.setFont('Manrope', 'normal')
                doc.text(p.qty, colX + 4, contentY)
                contentY += 4
            }

            if (p.description) {
                contentY += 1
                doc.setFontSize(8)
                doc.setTextColor(107, 114, 128)
                doc.setFont('Manrope', 'normal')
                const descLines = doc.splitTextToSize(p.description, colW - 8)
                for (const line of descLines) {
                    doc.text(line, colX + 4, contentY)
                    contentY += 4
                }
            }
        }

        const lastRowStart = prices.length - (prices.length % numCols || numCols)
        let lastRowH = 20
        for (let j = lastRowStart; j < prices.length; j++) {
            lastRowH = Math.max(lastRowH, calcCardHeight(prices[j]))
        }
        currentY += lastRowH + 6
    }

    // ==========================================
    // SECTION 5: Additional Images (Lampiran)
    // ==========================================
    const additionalImages = (() => {
        try {
            return item.additionalImages ? JSON.parse(item.additionalImages) : []
        } catch (e) {
            return []
        }
    })()

    if (additionalImages.length > 0) {
        currentY += 2

        const colGap = 6
        const numCols = 4
        const attachWidth = (pw - 28 - (colGap * (numCols - 1))) / numCols

        const imageChunks = [];
        for (let i = 0; i < additionalImages.length; i += numCols) {
            imageChunks.push(additionalImages.slice(i, i + numCols));
        }

        for (const chunk of imageChunks) {
            if (currentY + attachWidth + 5 > ph - 25) {
                doc.addPage()
                currentY = 35
            }

            for (let i = 0; i < chunk.length; i++) {
                try {
                    const imgB64 = await getBase64ImageFromUrl(chunk[i])
                    const type = imgB64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'
                    const ix = 14 + i * (attachWidth + colGap)
                    addImageWithAspectRatio(doc, imgB64, type, ix, currentY, attachWidth, attachWidth)
                } catch (e) { }
            }
            currentY += attachWidth + 5
        }
    }

    return currentY
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

    const addHeaderFooter = () => {
        const totalPages = doc.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)
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
            doc.text(`Halaman ${i} dari ${totalPages}`, pw - 14, ph - 10, { align: 'right' })
        }
    }

    await renderProductDetail(doc, item, 35, pw, ph)
    addHeaderFooter()

    if (returnBlob) {
        const blob = doc.output('blob')
        const size = blob.size
        const url = URL.createObjectURL(blob)
        return { url, size, formattedSize: formatBytes(size) }
    } else {
        doc.save(`Detail-Produk-${item.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`)
    }
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
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
                        addImageWithAspectRatio(doc, itemImages[ri], type, x, y, dim, dim)
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

export const generatePriceListGroupDetailPdf = async (group: any, items: any[], returnBlob = false) => {
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

    const addHeaderFooter = () => {
        const totalPages = doc.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)
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
            doc.text(`DAFTAR HARGA`, pw - 14, 16, { align: 'right' })

            doc.setFontSize(12)
            doc.setTextColor(17, 24, 39)
            doc.text(group.name.toUpperCase(), pw - 14, 22, { align: 'right' })

            doc.setFontSize(10)
            doc.setTextColor(102, 102, 102)
            doc.setFont('Manrope', 'normal')
            doc.text(date, pw - 14, 27, { align: 'right' })

            doc.setDrawColor(37, 99, 235)
            doc.setLineWidth(0.5)
            doc.line(14, 31, pw - 14, 31)

            doc.setDrawColor(229, 231, 235)
            doc.setLineWidth(0.2)
            doc.line(14, ph - 15, pw - 14, ph - 15)
            doc.setFontSize(8)
            doc.setTextColor(156, 163, 175)
            doc.text('Dokumen ini dibuat secara otomatis oleh sistem Ichibot.', 14, ph - 10)
            doc.text(`Halaman ${i} dari ${totalPages}`, pw - 14, ph - 10, { align: 'right' })
        }
    }

    let currentY = 35
    for (let i = 0; i < items.length; i++) {
        // Start each product on a new page if it's not the first one
        if (i > 0) {
            doc.addPage()
            currentY = 35
        }
        currentY = await renderProductDetail(doc, items[i], currentY, pw, ph, i + 1)
    }

    addHeaderFooter()

    if (returnBlob) {
        const blob = doc.output('blob')
        const size = blob.size
        const url = URL.createObjectURL(blob)
        return { url, size, formattedSize: formatBytes(size) }
    } else {
        doc.save(`Daftar-Harga-${group.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`)
    }
}
