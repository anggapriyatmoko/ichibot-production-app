'use client'

import { useState, useEffect, useRef } from 'react'
import { Bold, Italic, Type } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimpleWysiwygProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export default function SimpleWysiwyg({ value, onChange, placeholder, className }: SimpleWysiwygProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isFocused, setIsFocused] = useState(false)

    // Simple command execution
    const exec = (command: string) => {
        document.execCommand(command, false, undefined)
        editorRef.current?.focus()
    }

    // Update content if value changes externally
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML && !isFocused) {
            editorRef.current.innerHTML = value
        }
    }, [value, isFocused])

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML)
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const html = e.clipboardData.getData('text/html')
        const text = e.clipboardData.getData('text/plain')

        if (html) {
            const parser = new DOMParser()
            const doc = parser.parseFromString(html, 'text/html')

            // Remove all style attributes which carry backgrounds, colors, etc.
            const styledElements = doc.querySelectorAll('[style]')
            styledElements.forEach(el => el.removeAttribute('style'))

            // Remove classes that might carry styles
            const classedElements = doc.querySelectorAll('[class]')
            classedElements.forEach(el => el.removeAttribute('class'))

            const cleanHtml = doc.body.innerHTML
            document.execCommand('insertHTML', false, cleanHtml)
        } else {
            document.execCommand('insertText', false, text)
        }
        handleInput()
    }

    return (
        <div className={cn("border border-input rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}>
            <div className="flex items-center gap-1 p-2 border-b bg-muted/40">
                <button
                    type="button"
                    onClick={() => exec('bold')}
                    className="p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                    title="Bold"
                >
                    <Bold className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => exec('italic')}
                    className="p-1.5 hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                    title="Italic"
                >
                    <Italic className="w-4 h-4" />
                </button>
            </div>
            <div
                ref={editorRef}
                className="p-3 min-h-[100px] outline-none max-h-[300px] overflow-y-auto prose prose-sm max-w-none"
                contentEditable
                onInput={handleInput}
                onPaste={handlePaste}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            />
        </div>
    )
}

export function SimpleWysiwygDisplay({ content, className }: { content: string, className?: string }) {
    return (
        <div
            className={cn("prose prose-sm max-w-none", className)}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    )
}
