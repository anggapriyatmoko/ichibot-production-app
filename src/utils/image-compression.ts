'use client'

/**
 * Client-side image compression utility using Canvas API
 * Compresses images to target size by reducing dimensions and quality
 */

export async function compressImage(file: File, maxSizeKB: number = 700): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
            const img = new window.Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height

                // Max dimension 1200px
                const MAX_DIMENSION = 1200
                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    if (width > height) {
                        height = (height / width) * MAX_DIMENSION
                        width = MAX_DIMENSION
                    } else {
                        width = (width / height) * MAX_DIMENSION
                        height = MAX_DIMENSION
                    }
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Could not get canvas context'))
                    return
                }

                ctx.drawImage(img, 0, 0, width, height)

                // Start with quality 0.8 and reduce if needed
                let quality = 0.8
                const targetSizeBytes = maxSizeKB * 1024

                const tryCompress = () => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Failed to compress image'))
                                return
                            }

                            if (blob.size > targetSizeBytes && quality > 0.1) {
                                // Reduce quality and try again
                                quality -= 0.1
                                tryCompress()
                            } else {
                                // Create new file from blob
                                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                })
                                console.log(`Compressed from ${(file.size / 1024).toFixed(1)}KB to ${(compressedFile.size / 1024).toFixed(1)}KB (quality: ${quality.toFixed(1)})`)
                                resolve(compressedFile)
                            }
                        },
                        'image/jpeg',
                        quality
                    )
                }

                tryCompress()
            }
            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = event.target?.result as string
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
    })
}

/**
 * Process image file with compression if needed
 * Returns processed file or null if error
 */
export async function processImageFile(
    file: File,
    showError: (msg: string) => void,
    targetSizeKB: number = 700
): Promise<File | null> {
    const MAX_SIZE = targetSizeKB * 1024

    let processedFile = file

    // If file is larger than target size, compress it
    if (file.size > MAX_SIZE) {
        try {
            processedFile = await compressImage(file, targetSizeKB)
        } catch (error) {
            console.error('Compression failed:', error)
            showError('Gagal mengkompresi gambar')
            return null
        }
    }

    // Final check - if still over 1MB after compression, reject
    if (processedFile.size > 1 * 1024 * 1024) {
        showError('File gambar terlalu besar, tidak dapat dikompres di bawah 1MB')
        return null
    }

    return processedFile
}
