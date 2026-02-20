'use client'

import { useState, useEffect, useRef } from 'react'
import { Edit, Loader2, Save, X, Users, Upload, Trash2, Image as ImageIcon, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'
import Modal from '@/components/ui/modal'
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
    TableHeaderContent,
    TablePagination,
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
    const [page, setPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [filterRoles, setFilterRoles] = useState<string[]>(['HRD', 'ADMINISTRASI', 'TEKNISI', 'STORE', 'USER'])

    const ROLE_FILTERS = [
        { id: 'ADMIN', label: 'Admin', color: 'red' },
        { id: 'HRD', label: 'HRD', color: 'purple' },
        { id: 'ADMINISTRASI', label: 'Administrasi', color: 'blue' },
        { id: 'TEKNISI', label: 'Teknisi', color: 'cyan' },
        { id: 'STORE', label: 'Store', color: 'orange' },
        { id: 'USER', label: 'User', color: 'gray' },
        { id: 'EXTERNAL', label: 'External', color: 'emerald' },
    ]
    const ALL_ROLE_IDS = ROLE_FILTERS.map(r => r.id)

    const filteredUsers = users.filter(u => filterRoles.includes(u.role))
    const totalCount = filteredUsers.length
    const totalPages = Math.ceil(totalCount / itemsPerPage)
    const paginatedUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage)

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
                <TableHeaderContent
                    title="Data Karyawan & Gaji"
                    description="Kelola informasi karyawan, kontrak, dan input gaji."
                    icon={<Users className="w-5 h-5 font-bold text-primary" />}
                />

                <div className="p-4 border-b border-border bg-muted/10 flex flex-wrap items-center gap-4">
                    <span className="text-xs font-bold text-foreground">Filter :</span>
                    <div className="flex flex-wrap items-center gap-2">
                        {ROLE_FILTERS.map((f) => {
                            const isSelected = filterRoles.includes(f.id)
                            const colorMap: Record<string, string> = {
                                red: isSelected ? 'bg-red-500/10 border-red-500/30 text-red-600' : '',
                                purple: isSelected ? 'bg-purple-500/10 border-purple-500/30 text-purple-600' : '',
                                blue: isSelected ? 'bg-blue-500/10 border-blue-500/30 text-blue-600' : '',
                                cyan: isSelected ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600' : '',
                                orange: isSelected ? 'bg-orange-500/10 border-orange-500/30 text-orange-600' : '',
                                gray: isSelected ? 'bg-gray-500/10 border-gray-500/30 text-gray-600' : '',
                                emerald: isSelected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : '',
                            }
                            const dotMap: Record<string, string> = {
                                red: isSelected ? 'bg-red-500 ring-red-500/20' : '',
                                purple: isSelected ? 'bg-purple-500 ring-purple-500/20' : '',
                                blue: isSelected ? 'bg-blue-500 ring-blue-500/20' : '',
                                cyan: isSelected ? 'bg-cyan-500 ring-cyan-500/20' : '',
                                orange: isSelected ? 'bg-orange-500 ring-orange-500/20' : '',
                                gray: isSelected ? 'bg-gray-500 ring-gray-500/20' : '',
                                emerald: isSelected ? 'bg-emerald-500 ring-emerald-500/20' : '',
                            }
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => {
                                        setFilterRoles(prev => isSelected ? prev.filter(r => r !== f.id) : [...prev, f.id])
                                        setPage(1)
                                    }}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all',
                                        isSelected ? colorMap[f.color] : 'bg-background border-border text-muted-foreground/50 hover:bg-muted'
                                    )}
                                >
                                    <div className={cn(
                                        'w-1.5 h-1.5 rounded-full ring-2 ring-offset-1 ring-offset-transparent',
                                        isSelected ? dotMap[f.color] : 'bg-muted-foreground/20 ring-transparent'
                                    )} />
                                    {f.label}
                                </button>
                            )
                        })}

                        <div className="h-4 w-[1px] bg-border mx-1" />

                        <button
                            onClick={() => {
                                setFilterRoles(prev => prev.length === ALL_ROLE_IDS.length ? [] : [...ALL_ROLE_IDS])
                                setPage(1)
                            }}
                            className="text-[10px] font-bold text-primary hover:underline px-2"
                        >
                            {filterRoles.length === ALL_ROLE_IDS.length ? 'Unselect All' : 'Select All'}
                        </button>
                    </div>
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
                                paginatedUsers.map((user) => (
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

                <TablePagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(val) => { setItemsPerPage(val); setPage(1) }}
                    totalCount={totalCount}
                />
            </TableWrapper>

            {/* Edit Modal */}
            {editingUser && (
                <Modal
                    isOpen={!!editingUser}
                    onClose={closeModal}
                    title="Edit Data Karyawan"
                    maxWidth="lg"
                    footer={
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="editUserForm"
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
                    }
                >
                    <div className="p-4">
                        <form id="editUserForm" onSubmit={handleSave} className="space-y-4">
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

                        </form>
                    </div>
                </Modal>
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
