'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, Users, ArrowLeft, RefreshCw, Smile } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    getChatRooms,
    getMessages,
    sendMessage,
    getNewMessages,
    getChatUsers,
    getOrCreateDirectChat,
    getOrCreateGroupChat,
    getUnreadCount
} from '@/app/actions/chat'

type ChatRoom = {
    id: string
    name: string
    isGroup: boolean
    participants: { id: string; name: string }[]
    lastMessage: {
        content: string
        senderName: string
        createdAt: Date
    } | null
    updatedAt: Date
    unreadCount: number
}

type Message = {
    id: string
    content: string
    senderId: string
    senderName: string
    createdAt: Date
    isOwn: boolean
}

type User = {
    id: string
    name: string
}

import { useSidebar } from '@/components/providers/sidebar-provider'

export default function ChatWidget() {
    const { isChatOpen: isOpen, setIsChatOpen: setIsOpen, unreadCount, setUnreadCount } = useSidebar()
    const [view, setView] = useState<'list' | 'chat' | 'new'>('list')
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
    const [currentRoom, setCurrentRoom] = useState<{ id: string; name: string; isGroup?: boolean } | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [users, setUsers] = useState<User[]>([])
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const pollingRef = useRef<NodeJS.Timeout | null>(null)
    const unreadPollingRef = useRef<NodeJS.Timeout | null>(null)
    const lastMessageTimeRef = useRef<string | null>(null)
    const prevUnreadCountRef = useRef<number>(0)
    const audioContextRef = useRef<AudioContext | null>(null)
    const [showEmoji, setShowEmoji] = useState(false)

    // Common emoji categories
    const emojis = {
        'Sering': ['😀', '😂', '🥰', '😎', '👍', '❤️', '🙏', '💪', '🔥', '✨', '🎉', '👏'],
        'Wajah': ['😊', '😁', '😅', '🤣', '😇', '😍', '🤩', '😘', '😋', '🤔', '😏', '😌', '😢', '😭', '😱', '😡', '🥺', '😴'],
        'Gesture': ['👋', '🤝', '👌', '✌️', '🤞', '🤙', '👊', '✋', '🙌', '👐', '💪', '🙏'],
        'Simbol': ['❤️', '💕', '💯', '✅', '❌', '⭐', '🌟', '💡', '📌', '🔔', '⏰', '📅']
    }

    // Insert emoji to message
    const insertEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji)
        setShowEmoji(false)
    }

    // Play notification sound using Web Audio API
    const playNotificationSound = useCallback(() => {
        try {
            // Create audio context if not exists
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            }
            const ctx = audioContextRef.current

            // Create oscillator for notification beep
            const oscillator = ctx.createOscillator()
            const gainNode = ctx.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)

            // Pleasant notification sound - two quick beeps
            oscillator.frequency.setValueAtTime(800, ctx.currentTime)
            oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.1)
            oscillator.type = 'sine'

            // Fade in and out for smoother sound
            gainNode.gain.setValueAtTime(0, ctx.currentTime)
            gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02)
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15)

            oscillator.start(ctx.currentTime)
            oscillator.stop(ctx.currentTime + 0.15)
        } catch (e) {
            console.error('Error playing notification sound:', e)
        }
    }, [])

    // Load chat rooms
    const loadChatRooms = useCallback(async () => {
        try {
            const rooms = await getChatRooms()
            setChatRooms(rooms as ChatRoom[])
            setError(null)
        } catch (e) {
            console.error('Error loading chat rooms:', e)
            setError('Gagal memuat chat')
        }
    }, [])

    // Load unread count
    const loadUnreadCount = useCallback(async () => {
        try {
            const count = await getUnreadCount()

            // Play notification sound if unread count increased (new message when not in chat)
            if (count > prevUnreadCountRef.current && prevUnreadCountRef.current >= 0) {
                // Only play if widget is closed or on list view (not actively reading a chat)
                if (!isOpen || view === 'list') {
                    playNotificationSound()
                }
            }
            prevUnreadCountRef.current = count
            setUnreadCount(count)
        } catch (e) {
            console.error('Error loading unread count:', e)
        }
    }, [isOpen, view, playNotificationSound])

    // Load messages for current room
    const loadMessages = useCallback(async (roomId: string) => {
        setLoading(true)
        try {
            const result = await getMessages(roomId)
            if (!result.error) {
                setMessages(result.messages as Message[])
                if (result.messages.length > 0) {
                    lastMessageTimeRef.current = new Date(result.messages[result.messages.length - 1].createdAt).toISOString()
                } else {
                    lastMessageTimeRef.current = new Date().toISOString()
                }
                setError(null)
            }
        } catch (e) {
            console.error('Error loading messages:', e)
            setError('Gagal memuat pesan')
        }
        setLoading(false)
    }, [])

    // Poll for new messages - faster polling for real-time feel
    const pollNewMessages = useCallback(async () => {
        if (!currentRoom || !lastMessageTimeRef.current) return

        try {
            const result = await getNewMessages(currentRoom.id, lastMessageTimeRef.current)
            if (result.messages && result.messages.length > 0) {
                // Check if there are new messages from others
                const hasNewFromOthers = result.messages.some((m: Message) => !m.isOwn)

                setMessages(prev => {
                    const newMsgs = result.messages.filter(
                        (nm: Message) => !prev.some(pm => pm.id === nm.id)
                    )
                    if (newMsgs.length > 0) {
                        lastMessageTimeRef.current = new Date(newMsgs[newMsgs.length - 1].createdAt).toISOString()

                        // Play sound for new messages from others
                        if (hasNewFromOthers) {
                            playNotificationSound()
                        }

                        return [...prev, ...newMsgs]
                    }
                    return prev
                })
            }
        } catch (e) {
            console.error('Error polling messages:', e)
        }
    }, [currentRoom, playNotificationSound])

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Poll chat rooms when on list view - for real-time updates
    const listPollingRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (isOpen && view === 'list') {
            loadChatRooms()

            // Start polling chat rooms every 2 seconds for real-time list updates
            listPollingRef.current = setInterval(loadChatRooms, 2000)

            return () => {
                if (listPollingRef.current) {
                    clearInterval(listPollingRef.current)
                }
            }
        }
    }, [isOpen, view, loadChatRooms])

    // Load unread count periodically - faster polling
    useEffect(() => {
        loadUnreadCount()
        unreadPollingRef.current = setInterval(loadUnreadCount, 3000) // Check every 3 seconds
        return () => {
            if (unreadPollingRef.current) {
                clearInterval(unreadPollingRef.current)
            }
        }
    }, [loadUnreadCount])

    // Start/stop polling when entering/leaving chat - faster polling (1 second)
    useEffect(() => {
        if (view === 'chat' && currentRoom) {
            loadMessages(currentRoom.id)

            // Start polling every 1 second for real-time feel
            pollingRef.current = setInterval(pollNewMessages, 1000)

            return () => {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current)
                }
            }
        }
    }, [view, currentRoom, loadMessages, pollNewMessages])

    // Handle send message
    const handleSend = async () => {
        if (!currentRoom || !newMessage.trim() || sending) return

        const messageContent = newMessage.trim()
        setNewMessage('') // Clear immediately for better UX
        setSending(true)

        try {
            const result = await sendMessage(currentRoom.id, messageContent)
            if (!result.error && result.message) {
                setMessages(prev => [...prev, result.message as Message])
                lastMessageTimeRef.current = new Date(result.message.createdAt).toISOString()
            } else if (result.error) {
                setNewMessage(messageContent) // Restore message on error
                setError(result.error)
            }
        } catch (e) {
            console.error('Error sending message:', e)
            setNewMessage(messageContent) // Restore message on error
            setError('Gagal mengirim pesan')
        }
        setSending(false)
    }

    // Handle key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Open chat room
    const openRoom = (room: ChatRoom) => {
        setCurrentRoom({ id: room.id, name: room.name, isGroup: room.isGroup })
        setView('chat')
        setError(null)
    }

    // Start new chat
    const startNewChat = async () => {
        setLoading(true)
        try {
            const userList = await getChatUsers()
            setUsers(userList as User[])
            setView('new')
            setError(null)
        } catch (e) {
            console.error('Error loading users:', e)
            setError('Gagal memuat daftar user')
        }
        setLoading(false)
    }

    // Open direct chat with user
    const openDirectChat = async (userId: string) => {
        setLoading(true)
        try {
            const result = await getOrCreateDirectChat(userId)
            if (!result.error && result.chatRoomId) {
                setCurrentRoom({ id: result.chatRoomId, name: result.name || 'Chat', isGroup: false })
                setView('chat')
                setError(null)
            } else if (result.error) {
                setError(result.error)
            }
        } catch (e) {
            console.error('Error creating direct chat:', e)
            setError('Gagal membuat chat')
        }
        setLoading(false)
    }

    // Open group chat
    const openGroupChat = async () => {
        setLoading(true)
        try {
            const result = await getOrCreateGroupChat()
            if (!result.error && result.chatRoomId) {
                setCurrentRoom({ id: result.chatRoomId, name: result.name || 'Semua User', isGroup: true })
                setView('chat')
                setError(null)
            } else if (result.error) {
                setError(result.error)
            }
        } catch (e) {
            console.error('Error creating group chat:', e)
            setError('Gagal membuat grup chat')
        }
        setLoading(false)
    }

    // Refresh messages manually
    const refreshMessages = () => {
        if (currentRoom) {
            loadMessages(currentRoom.id)
        }
    }

    // Format time
    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Format date for message groups
    const formatDate = (date: Date) => {
        const d = new Date(date)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        if (d.toDateString() === today.toDateString()) return 'Hari Ini'
        if (d.toDateString() === yesterday.toDateString()) return 'Kemarin'
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    // Render message content with clickable links
    const renderMessageWithLinks = (content: string, isOwn: boolean) => {
        // URL regex pattern - matches http, https, and www URLs
        const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi

        // Split content by URLs while preserving them
        const parts = content.split(urlPattern).filter(Boolean)

        if (parts.length === 1 && !urlPattern.test(content)) {
            // No URLs found, return plain text
            return content
        }

        // Reset pattern for testing
        urlPattern.lastIndex = 0

        return content.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi).map((part, index) => {
            if (!part) return null

            // Check if this part is a URL
            const isUrl = /^(https?:\/\/|www\.)/i.test(part)

            if (isUrl) {
                // Ensure URL has protocol
                const href = part.startsWith('www.') ? `https://${part}` : part
                return (
                    <a
                        key={index}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            "underline hover:opacity-80 break-all",
                            isOwn ? "text-white" : "text-blue-600"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                )
            }

            return part
        })
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 hidden lg:block">
            {/* Chat Panel */}
            {isOpen && (
                <div className="w-80 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 flex items-center gap-3">
                        {view !== 'list' && (
                            <button
                                onClick={() => {
                                    setView('list')
                                    setCurrentRoom(null)
                                    setMessages([])
                                    setError(null)
                                    loadChatRooms()
                                }}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold truncate">
                                {view === 'list' ? 'Pesan' : view === 'new' ? 'Chat Baru' : currentRoom?.name}
                            </h3>
                            {view === 'chat' && currentRoom?.isGroup && (
                                <p className="text-xs text-white/70">Grup Chat</p>
                            )}
                        </div>
                        {view === 'chat' && (
                            <button
                                onClick={refreshMessages}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setIsOpen(false)
                                setView('list')
                                setCurrentRoom(null)
                                setMessages([])
                                setError(null)
                            }}
                            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="px-4 py-2 bg-red-50 text-red-600 text-xs text-center">
                            {error}
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* Chat List View */}
                        {view === 'list' && (
                            <div className="flex-1 overflow-y-auto">
                                {/* New Chat Buttons */}
                                <div className="p-3 border-b border-gray-100 flex gap-2">
                                    <button
                                        onClick={openGroupChat}
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50"
                                    >
                                        <Users className="w-4 h-4" />
                                        Semua User
                                    </button>
                                    <button
                                        onClick={startNewChat}
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Chat Baru
                                    </button>
                                </div>

                                {/* Chat Rooms */}
                                {chatRooms.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                        <MessageCircle className="w-12 h-12 mb-2 opacity-30" />
                                        <p className="text-sm">Belum ada pesan</p>
                                        <p className="text-xs mt-1">Mulai chat dengan tombol di atas</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {chatRooms.map(room => (
                                            <button
                                                key={room.id}
                                                onClick={() => openRoom(room)}
                                                className="w-full p-3 hover:bg-gray-50 transition-colors text-left flex items-start gap-3"
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0",
                                                    room.isGroup ? "bg-gradient-to-br from-green-400 to-emerald-600" : "bg-gradient-to-br from-blue-400 to-indigo-600"
                                                )}>
                                                    {room.isGroup ? <Users className="w-5 h-5" /> : room.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <span className="font-medium text-gray-900 truncate">{room.name}</span>
                                                        <div className="flex flex-col items-end shrink-0">
                                                            {room.lastMessage && (
                                                                <span className="text-xs text-gray-400">
                                                                    {formatTime(room.lastMessage.createdAt)}
                                                                </span>
                                                            )}
                                                            {room.unreadCount > 0 && (
                                                                <span className="mt-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                                                    {room.unreadCount > 99 ? '99+' : room.unreadCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {room.lastMessage && (
                                                        <p className="text-sm text-gray-500 truncate">
                                                            {room.isGroup && <span className="font-medium">{room.lastMessage.senderName}: </span>}
                                                            {room.lastMessage.content}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* New Chat View */}
                        {view === 'new' && (
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                    </div>
                                ) : users.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                        <Users className="w-12 h-12 mb-2 opacity-30" />
                                        <p className="text-sm">Tidak ada user lain</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {users.map(user => (
                                            <button
                                                key={user.id}
                                                onClick={() => openDirectChat(user.id)}
                                                className="w-full p-3 hover:bg-gray-50 transition-colors text-left flex items-center gap-3"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900">{user.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Chat View */}
                        {view === 'chat' && (
                            <>
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                                    {loading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                            <MessageCircle className="w-12 h-12 mb-2 opacity-30" />
                                            <p className="text-sm">Belum ada pesan</p>
                                            <p className="text-xs">Mulai percakapan!</p>
                                        </div>
                                    ) : (
                                        <>
                                            {messages.map((msg, idx) => {
                                                const showDate = idx === 0 || formatDate(messages[idx - 1].createdAt) !== formatDate(msg.createdAt)
                                                return (
                                                    <div key={msg.id}>
                                                        {showDate && (
                                                            <div className="text-center my-3">
                                                                <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full">
                                                                    {formatDate(msg.createdAt)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className={cn(
                                                            "flex",
                                                            msg.isOwn ? "justify-end" : "justify-start"
                                                        )}>
                                                            <div className={cn(
                                                                "max-w-[80%] rounded-2xl px-3 py-2 shadow-sm",
                                                                msg.isOwn
                                                                    ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-sm"
                                                                    : "bg-white text-gray-900 rounded-bl-sm border border-gray-100"
                                                            )}>
                                                                {!msg.isOwn && currentRoom?.isGroup && (
                                                                    <p className="text-xs font-semibold text-blue-600 mb-1">{msg.senderName}</p>
                                                                )}
                                                                <p className="text-sm whitespace-pre-wrap break-words">{renderMessageWithLinks(msg.content, msg.isOwn)}</p>
                                                                <p className={cn(
                                                                    "text-[10px] mt-1 text-right",
                                                                    msg.isOwn ? "text-white/70" : "text-gray-400"
                                                                )}>
                                                                    {formatTime(msg.createdAt)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            <div ref={messagesEndRef} />
                                        </>
                                    )}
                                </div>

                                {/* Message Input */}
                                <div className="p-3 border-t border-gray-100 bg-white relative">
                                    {/* Emoji Picker */}
                                    {showEmoji && (
                                        <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-t-xl shadow-lg p-2 max-h-48 overflow-y-auto">
                                            {Object.entries(emojis).map(([category, emojiList]) => (
                                                <div key={category} className="mb-2">
                                                    <p className="text-xs text-gray-500 font-medium mb-1">{category}</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {emojiList.map((emoji, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => insertEmoji(emoji)}
                                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg transition-colors"
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-end gap-2">
                                        <button
                                            onClick={() => setShowEmoji(!showEmoji)}
                                            className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                showEmoji ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                            )}
                                        >
                                            <Smile className="w-5 h-5" />
                                        </button>
                                        <textarea
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            onFocus={() => setShowEmoji(false)}
                                            placeholder="Ketik pesan..."
                                            rows={1}
                                            className="flex-1 px-3 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-20"
                                            style={{ minHeight: '40px' }}
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={!newMessage.trim() || sending}
                                            className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                        >
                                            {sending ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <Send className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
