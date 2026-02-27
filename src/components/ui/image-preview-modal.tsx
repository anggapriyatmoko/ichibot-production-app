'use client'

import { useState } from 'react'
import Modal from '@/components/ui/modal'
import { Download } from 'lucide-react'

interface ImagePreviewModalProps {
    image: { url: string; name: string } | null
    onClose: () => void
}

export default function ImagePreviewModal({ image, onClose }: ImagePreviewModalProps) {
    const [imageSize, setImageSize] = useState('')
    const [fileSize, setFileSize] = useState('')

    if (!image) return null

    return (
        <Modal
            isOpen={!!image}
            onClose={onClose}
            title={image.name}
            maxWidth="2xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-muted-foreground">{imageSize}{fileSize && ` (${fileSize})`}</span>
                    <div className="flex gap-2">
                        <a
                            href={image.url}
                            download={image.name}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </a>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            }
        >
            <div className="flex items-center justify-center p-4">
                <img
                    src={image.url}
                    alt={image.name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    onLoad={(e) => {
                        const img = e.currentTarget
                        setImageSize(`${img.naturalWidth} × ${img.naturalHeight} px`)
                        fetch(img.src).then(res => res.blob()).then(blob => {
                            const bytes = blob.size
                            if (bytes >= 1024 * 1024) {
                                setFileSize(`${(bytes / (1024 * 1024)).toFixed(2)} MB`)
                            } else {
                                setFileSize(`${(bytes / 1024).toFixed(1)} KB`)
                            }
                        }).catch(() => { })
                    }}
                />
            </div>
        </Modal>
    )
}
