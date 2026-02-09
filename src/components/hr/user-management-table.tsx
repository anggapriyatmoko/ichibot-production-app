'use client'

import { useState, useEffect, useRef } from 'react'
import { Edit, Loader2, Save, X, Users, Upload, Trash2, Image as ImageIcon, Banknote } from 'lucide-react'
import { getAllUsersForHRD, updateUserData } from '@/app/actions/hrd'
import { useAlert } from '@/hooks/use-alert'
import Image from 'next/image'
import PayrollModal from './payroll-modal'
import {
    TableWrapper,
    TableScrollArea,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
} from '@/components/ui/table'

interface User {
    id: string
    email: string | null
    username: string
    name: string | null
    department: string | null
    role: string
    photo: string | null
    phone: string | null
    address: string | null
    ktpNumber: string | null
    contractEndDate: string | null
    createdAt: Date
}

// ... (lines 36-100 irrelevant for replacement, using large chunk logic or specific points?
// I'll make separate chunks if possible using multi, or just replace interface and specific lines)


// Helper to calculate remaining time
function calculateRemainingTime(dateString: string | null) {
    if (!dateString) return null

    const end = new Date(dateString)
    const now = new Date()

    // Reset time for accurate date comparison
    end.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)

    if (end < now) return <span className="text-xs text-red-500 font-medium">Sudah Berakhir</span>

    let months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
    let days = end.getDate() - now.getDate()

    if (days < 0) {
        months--
        // Days in previous month
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0)
        days += prevMonth.getDate()
    }

    if (months < 0) return <span className="text-xs text-red-500 font-medium">Sudah Berakhir</span>

    const parts = []
    if (months > 0) parts.push(`${months} bulan`)
    if (days > 0) parts.push(`${days} hari`)

    if (parts.length === 0) return <span className="text-xs text-orange-500 font-medium">Berakhir Hari Ini</span>

    return <span className="text-xs text-emerald-600 font-medium">Sisa: {parts.join(' ')}</span>
}

interface Props {
    userRole: string
}

export default function UserManagementTable({ userRole }: Props) {
    const { showAlert, showError } = useAlert()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [saving, setSaving] = useState(false)
    const [payrollUser, setPayrollUser] = useState<User | null>(null)

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        userId: '',
        email: '',
        department: '',
        role: '',
        phone: '',
        address: '',
        ktpNumber: '',
        contractEndDate: ''
    })

    // Image Handling States
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [removePhoto, setRemovePhoto] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        setLoading(true)
        try {
            const data = await getAllUsersForHRD()
            setUsers(data)
        } catch (err) {
            console.error('Failed to load users:', err)
            showError('Gagal memuat data karyawan')
        } finally {
            setLoading(false)
        }
    }

    const openEditModal = (user: User) => {
        setFormData({
            userId: user.id,
            name: user.name || '',
            email: user.email || '',
            department: user.department || '',
            role: user.role,
            phone: user.phone || '',
            address: user.address || '',
            ktpNumber: user.ktpNumber || '',
            contractEndDate: user.contractEndDate || ''
        })

        // Reset image states
        setPreviewUrl(user.photo)
        setSelectedFile(null)
        setRemovePhoto(false)

        setEditingUser(user)
    }

    const closeModal = () => {
        setEditingUser(null)
        setPreviewUrl(null)
        setSelectedFile(null)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Client-side validation (1MB limit)
            const MAX_SIZE = 1 * 1024 * 1024
            if (file.size > MAX_SIZE) {
                showError('File gambar melebihi 1MB')
                e.target.value = ''
                return
            }
            // Create preview URL
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
            setSelectedFile(file)
            setRemovePhoto(false)
        }
    }

    const handleRemovePhoto = () => {
        setPreviewUrl(null)
        setSelectedFile(null)
        setRemovePhoto(true)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingUser) return

        setSaving(true)
        try {
            const fd = new FormData()
            fd.append('userId', editingUser.id)
            fd.append('name', formData.name)
            fd.append('email', formData.email)
            fd.append('department', formData.department)
            // fd.append('role', formData.role) // Role not editable

            fd.append('phone', formData.phone)
            fd.append('address', formData.address)
            fd.append('ktpNumber', formData.ktpNumber)
            fd.append('contractEndDate', formData.contractEndDate)

            if (selectedFile) {
                fd.append('photo', selectedFile)
            }
            if (removePhoto) {
                fd.append('removePhoto', 'true')
            }

            await updateUserData(fd)
            showAlert('Data karyawan berhasil diperbarui')
            closeModal()
            loadUsers() // Refresh list
        } catch (err) {
            console.error('Failed to save:', err)
            showError('Gagal menyimpan data')
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <TableWrapper loading={loading}>
                <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Data Karyawan & Gaji</h2>
                </div>

                <TableScrollArea>
                    <Table>
                        <TableHeader>
                            <TableRow hoverable={false} className="bg-muted/50">
                                <TableHead>Nama & Role</TableHead>
                                <TableHead>Kontak</TableHead>
                                <TableHead>Info Karyawan</TableHead>
                                <TableHead>KTP & Alamat</TableHead>
                                <TableHead align="center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableEmpty
                                    colSpan={5}
                                    message="Belum ada data karyawan."
                                    icon={<Users className="w-12 h-12 opacity-20" />}
                                />
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {/* Small Avatar */}
                                                <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0 border border-border">
                                                    {user.photo ? (
                                                        <Image
                                                            src={user.photo}
                                                            alt={user.name || 'User'}
                                                            width={32}
                                                            height={32}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Users className="w-4 h-4 m-auto text-muted-foreground h-full" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground">{user.name || '-'}</p>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${user.role === 'ADMIN' ? 'bg-red-500/10 text-red-600' :
                                                        user.role === 'HRD' ? 'bg-purple-500/10 text-purple-600' :
                                                            user.role === 'TEKNISI' ? 'bg-blue-500/10 text-blue-600' :
                                                                user.role === 'EXTERNAL' ? 'bg-emerald-500/10 text-emerald-600' :
                                                                    'bg-gray-500/10 text-gray-600'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-muted-foreground">{user.email}</span>
                                                {user.phone && <span className="text-xs text-foreground">{user.phone}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-foreground">{user.department || '-'}</span>
                                                {user.contractEndDate && (
                                                    <>
                                                        <span className="text-xs text-muted-foreground">
                                                            Kontrak: {new Date(user.contractEndDate).toLocaleDateString('id-ID')}
                                                        </span>
                                                        {calculateRemainingTime(user.contractEndDate)}
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <div className="flex flex-col gap-0.5">
                                                {user.ktpNumber && <span className="font-mono text-xs">{user.ktpNumber}</span>}
                                                {user.address && <span className="text-xs text-muted-foreground line-clamp-2" title={user.address}>{user.address}</span>}
                                                {!user.ktpNumber && !user.address && <span className="text-muted-foreground">-</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell align="center">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setPayrollUser(user)}
                                                className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-500/10 rounded-lg transition-colors"
                                                title="Input Gaji"
                                            >
                                                <Banknote className="w-4 h-4" />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableScrollArea>
            </TableWrapper>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
                            <h3 className="text-lg font-bold text-foreground">
                                Edit Data Karyawan
                            </h3>
                            <button
                                onClick={closeModal}
                                className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            {/* Photo Upload Section */}
                            <div className="flex justify-center mb-4">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                                        {previewUrl ? (
                                            <Image
                                                src={previewUrl}
                                                alt="Preview"
                                                width={96}
                                                height={96}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <div className="absolute -bottom-2 translate-y-full left-1/2 -translate-x-1/2 flex items-center gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm"
                                            title="Ganti Foto"
                                        >
                                            <Edit className="w-3 h-3" />
                                        </button>
                                        {previewUrl && (
                                            <button
                                                type="button"
                                                onClick={handleRemovePhoto}
                                                className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                                                title="Hapus Foto"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-center mb-4">
                                <p className="text-xs text-muted-foreground">Klik ikon pencil untuk mengubah foto</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Nama</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Departemen</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
                                    <input
                                        type="text"
                                        value={formData.role}
                                        disabled
                                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed"
                                        title="Role tidak dapat diubah di sini"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-border pt-4 mt-4">
                                <p className="text-xs font-medium text-muted-foreground mb-3">Data Pribadi (Terenkripsi)</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">No HP</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="08xxxxxxxxxx"
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">No KTP</label>
                                    <input
                                        type="text"
                                        value={formData.ktpNumber}
                                        onChange={(e) => setFormData({ ...formData, ktpNumber: e.target.value })}
                                        placeholder="16 digit"
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Alamat</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Masa Kontrak Berakhir</label>
                                <input
                                    type="date"
                                    value={formData.contractEndDate}
                                    onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Simpan
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payroll Modal */}
            {payrollUser && (
                <PayrollModal
                    user={payrollUser}
                    onClose={() => setPayrollUser(null)}
                />
            )}
        </>
    )
}
