'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser, requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt } from '@/lib/crypto'

// Get all chat rooms for current user
export async function getChatRooms() {
    const user = await getCurrentUser()
    if (!user) return []

    const chatRooms = await (prisma.chatRoom as any).findMany({
        where: {
            participants: {
                some: {
                    userId: user.id
                }
            }
        },
        include: {
            participants: {
                include: {
                    user: {
                        select: {
                            id: true,
                            nameEnc: true,
                            usernameEnc: true
                        }
                    }
                }
            },
            messages: {
                orderBy: {
                    createdAt: 'desc'
                },
                take: 1,
                include: {
                    sender: {
                        select: {
                            id: true,
                            nameEnc: true
                        }
                    }
                }
            }
        },
        orderBy: {
            updatedAt: 'desc'
        }
    }) as any[]

    // Calculate unread count for each room
    const roomsWithUnread = await Promise.all(chatRooms.map(async (room: any) => {
        const otherParticipants = room.participants.filter((p: any) => p.userId !== user.id)
        const lastMessage = room.messages[0] || null

        // Get current user's participant record to check lastSeenAt
        const myParticipant = room.participants.find((p: any) => p.userId === user.id)
        const lastSeenAt = myParticipant?.lastSeenAt || new Date(0)

        // Count unread messages (messages after lastSeenAt, not sent by current user)
        const unreadCount = await prisma.chatMessage.count({
            where: {
                chatRoomId: room.id,
                createdAt: { gt: lastSeenAt },
                senderId: { not: user.id }
            }
        })

        return {
            id: room.id,
            name: room.isGroup ? (decrypt(room.nameEnc) || 'Semua User') : decrypt(otherParticipants[0]?.user.nameEnc) || decrypt(otherParticipants[0]?.user.usernameEnc) || 'Unknown',
            isGroup: room.isGroup,
            participants: room.participants.map((p: any) => ({
                id: p.user.id,
                name: decrypt(p.user.nameEnc) || decrypt(p.user.usernameEnc) || 'Unknown'
            })),
            lastMessage: lastMessage ? {
                content: decrypt(lastMessage.contentEnc),
                senderName: decrypt(lastMessage.sender.nameEnc) || 'Unknown',
                createdAt: lastMessage.createdAt
            } : null,
            updatedAt: room.updatedAt,
            unreadCount
        }
    }))

    return roomsWithUnread
}

// Get or create direct chat with another user
export async function getOrCreateDirectChat(otherUserId: string) {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized' }

    if (user.id === otherUserId) {
        return { error: 'Cannot chat with yourself' }
    }

    // Find existing direct chat
    const existingChat = await (prisma.chatRoom as any).findFirst({
        where: {
            isGroup: false,
            AND: [
                { participants: { some: { userId: user.id } } },
                { participants: { some: { userId: otherUserId } } }
            ]
        },
        include: {
            participants: {
                where: {
                    userId: { not: user.id }
                },
                include: {
                    user: {
                        select: { id: true, nameEnc: true, usernameEnc: true }
                    }
                }
            }
        }
    }) as any

    if (existingChat) {
        return {
            chatRoomId: existingChat.id,
            name: decrypt(existingChat.participants[0]?.user.nameEnc) || decrypt(existingChat.participants[0]?.user.usernameEnc) || 'Unknown'
        }
    }

    // Create new direct chat
    const newChat = await (prisma.chatRoom as any).create({
        data: {
            isGroup: false,
            participants: {
                create: [
                    { userId: user.id },
                    { userId: otherUserId }
                ]
            }
        },
        include: {
            participants: {
                where: {
                    userId: { not: user.id }
                },
                include: {
                    user: {
                        select: { id: true, nameEnc: true, usernameEnc: true }
                    }
                }
            }
        }
    }) as any

    return {
        chatRoomId: newChat.id,
        name: decrypt(newChat.participants[0]?.user.nameEnc) || decrypt(newChat.participants[0]?.user.usernameEnc) || 'Unknown'
    }
}

// Get or create group chat for all users
export async function getOrCreateGroupChat() {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized' }

    // Find existing group chat named "Semua User"
    const existingGroup = await (prisma.chatRoom as any).findFirst({
        where: {
            isGroup: true,
            nameEnc: encrypt('Semua User')
        }
    }) as any

    if (existingGroup) {
        // Make sure current user is a participant
        const isParticipant = await prisma.chatParticipant.findUnique({
            where: {
                chatRoomId_userId: {
                    chatRoomId: existingGroup.id,
                    userId: user.id
                }
            }
        })

        if (!isParticipant) {
            await prisma.chatParticipant.create({
                data: {
                    chatRoomId: existingGroup.id,
                    userId: user.id
                }
            })
        }

        return { chatRoomId: existingGroup.id, name: 'Semua User' }
    }

    // Create new group chat with all users
    const allUsers = await prisma.user.findMany({
        select: { id: true }
    })

    const newGroup = await (prisma.chatRoom as any).create({
        data: {
            nameEnc: encrypt('Semua User'),
            isGroup: true,
            participants: {
                create: allUsers.map(u => ({ userId: u.id }))
            }
        }
    }) as any

    return { chatRoomId: newGroup.id, name: 'Semua User' }
}

// Get messages for a chat room
export async function getMessages(chatRoomId: string, cursor?: string, limit: number = 50) {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized', messages: [] }

    // Verify user is participant
    const isParticipant = await prisma.chatParticipant.findUnique({
        where: {
            chatRoomId_userId: {
                chatRoomId,
                userId: user.id
            }
        }
    })

    if (!isParticipant) {
        return { error: 'Not a participant', messages: [] }
    }

    const messages = await (prisma.chatMessage as any).findMany({
        where: {
            chatRoomId,
            ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {})
        },
        include: {
            sender: {
                select: {
                    id: true,
                    nameEnc: true,
                    usernameEnc: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: limit
    }) as any[]

    // Update last seen
    await prisma.chatParticipant.update({
        where: {
            chatRoomId_userId: {
                chatRoomId,
                userId: user.id
            }
        },
        data: {
            lastSeenAt: new Date()
        }
    })

    return {
        messages: messages.reverse().map((m: any) => ({
            id: m.id,
            content: decrypt(m.contentEnc) || 'Pesan terenkripsi',
            senderId: m.senderId,
            senderName: decrypt(m.sender.nameEnc) || decrypt(m.sender.usernameEnc) || 'Unknown',
            createdAt: m.createdAt,
            isOwn: m.senderId === user.id
        }))
    }
}

// Send a message
export async function sendMessage(chatRoomId: string, content: string) {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized' }

    if (!content.trim()) {
        return { error: 'Message cannot be empty' }
    }

    // Verify user is participant
    const isParticipant = await prisma.chatParticipant.findUnique({
        where: {
            chatRoomId_userId: {
                chatRoomId,
                userId: user.id
            }
        }
    })

    if (!isParticipant) {
        return { error: 'Not a participant' }
    }

    const message = await (prisma.chatMessage as any).create({
        data: {
            chatRoomId,
            senderId: user.id,
            contentEnc: encrypt(content.trim())
        },
        include: {
            sender: {
                select: {
                    id: true,
                    nameEnc: true,
                    usernameEnc: true
                }
            }
        }
    }) as any

    // Update chat room's updatedAt
    await prisma.chatRoom.update({
        where: { id: chatRoomId },
        data: { updatedAt: new Date() }
    })

    return {
        message: {
            id: message.id,
            content: decrypt(message.contentEnc) || 'Pesan terenkripsi',
            senderId: message.senderId,
            senderName: decrypt(message.sender.nameEnc) || decrypt(message.sender.usernameEnc) || 'Unknown',
            createdAt: message.createdAt,
            isOwn: true
        }
    }
}

// Get new messages since last message ID (for polling)
export async function getNewMessages(chatRoomId: string, afterTimestamp: string) {
    const user = await getCurrentUser()
    if (!user) return { messages: [] }

    const messages = await (prisma.chatMessage as any).findMany({
        where: {
            chatRoomId,
            createdAt: { gt: new Date(afterTimestamp) }
        },
        include: {
            sender: {
                select: {
                    id: true,
                    nameEnc: true,
                    usernameEnc: true
                }
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    }) as any[]

    // Update lastSeenAt to mark messages as read
    if (messages.length > 0) {
        await prisma.chatParticipant.update({
            where: {
                chatRoomId_userId: {
                    chatRoomId,
                    userId: user.id
                }
            },
            data: {
                lastSeenAt: new Date()
            }
        })
    }

    return {
        messages: messages.map((m: any) => ({
            id: m.id,
            content: decrypt(m.contentEnc) || 'Pesan terenkripsi',
            senderId: m.senderId,
            senderName: decrypt(m.sender.nameEnc) || decrypt(m.sender.usernameEnc) || 'Unknown',
            createdAt: m.createdAt,
            isOwn: m.senderId === user.id
        }))
    }
}

// Get all users for starting a new chat
export async function getChatUsers() {
    const user = await getCurrentUser()
    if (!user) return []

    const users = await (prisma.user as any).findMany({
        where: {
            id: { not: user.id }
        },
        select: {
            id: true,
            nameEnc: true,
            usernameEnc: true
        },
        orderBy: {
            id: 'asc'
        }
    }) as any[]

    return users.map((u: any) => ({
        id: u.id,
        name: decrypt(u.nameEnc) || decrypt(u.usernameEnc) || 'Unknown'
    }))
}

// Get unread count for current user
export async function getUnreadCount() {
    const user = await getCurrentUser()
    if (!user) return 0

    const participations = await prisma.chatParticipant.findMany({
        where: {
            userId: user.id
        },
        select: {
            chatRoomId: true,
            lastSeenAt: true
        }
    })

    let totalUnread = 0

    for (const p of participations) {
        const count = await prisma.chatMessage.count({
            where: {
                chatRoomId: p.chatRoomId,
                createdAt: { gt: p.lastSeenAt },
                senderId: { not: user.id }
            }
        })
        totalUnread += count
    }

    return totalUnread
}
