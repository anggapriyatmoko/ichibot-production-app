import { requireAdmin } from "@/lib/auth"
import BackupManager from "@/components/settings/backup-manager"
import ApiConfigManager from "@/components/settings/api-config-manager"

export const metadata = {
    title: 'Settings | Ichibot Production',
    description: 'System settings and data management',
}

export default async function SettingsPage() {
    await requireAdmin()

    return (
        <div className="container mx-auto max-w-5xl">
            <h1 className="text-3xl font-bold mb-8">System Settings</h1>

            <div className="mb-10">
                <BackupManager />
            </div>

            <div className="mb-10">
                <ApiConfigManager />
            </div>

            {/* Placeholder for future settings */}
            <div className="p-6 border border-border rounded-xl bg-muted/5">
                <h3 className="font-semibold text-lg mb-2">Application Info</h3>
                <div className="text-sm text-muted-foreground grid grid-cols-2 gap-4 max-w-sm">
                    <div>Version</div>
                    <div className="font-mono">v1.0.0</div>
                    <div>Environment</div>
                    <div className="font-mono">{process.env.NODE_ENV}</div>
                </div>
            </div>
        </div>
    )
}
