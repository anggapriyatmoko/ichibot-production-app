'use client'

import { useState } from 'react'
import { setSystemSetting } from '@/app/actions/settings'
import { useAlert } from '@/hooks/use-alert'

export default function AnnouncementSettings({ initialSpeed }: { initialSpeed: number }) {
    const [speed, setSpeed] = useState(initialSpeed)
    const [saving, setSaving] = useState(false)
    const { showAlert } = useAlert()

    const handleSave = async () => {
        setSaving(true)
        const res = await setSystemSetting('ANNOUNCEMENT_SPEED', speed.toString())
        if (res.success) {
            showAlert('Kecepatan pengumuman diperbarui', 'success')
        } else {
            showAlert('Gagal memperbarui kecepatan', 'error')
        }
        setSaving(false)
    }

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Pengaturan Pengumuman</h2>
            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Kecepatan Running Text (detik per item)</label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="5"
                            max="30"
                            value={speed}
                            onChange={(e) => setSpeed(parseInt(e.target.value))}
                            className="w-full max-w-xs h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <span className="font-mono bg-muted px-2 py-1 rounded text-sm w-12 text-center">{speed}s</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Semakin kecil angka, semakin cepat teks berjalan.</p>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-bold shadow-sm disabled:opacity-50 text-sm"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                </div>
            </div>
        </div>
    )
}
