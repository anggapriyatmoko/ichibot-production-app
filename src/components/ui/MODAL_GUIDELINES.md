# Modal Component Guidelines

## Z-Index Hierarchy

Modal dialogs MUST use the following z-index to ensure they appear above all other UI elements:

| Element Type | Z-Index | Description |
|-------------|---------|-------------|
| Header | `z-30` | Sticky header at top |
| Sidebar | `z-40` | Navigation sidebar |
| **Modal Overlay** | **`z-[100]`** | Modal background and container |
| Chat Widget | `z-50` | Floating chat button |

## Modal Template

When creating a new modal, use this template:

```tsx
{isModalOpen && (
    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center py-20 md:py-8 px-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
        <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-border shrink-0">
                <h3 className="text-lg font-semibold">Modal Title</h3>
            </div>
            
            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
                {/* Your content here */}
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 border-t border-border shrink-0 flex justify-end gap-3">
                <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    Batal
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                    Simpan
                </button>
            </div>
        </div>
    </div>
)}
```

## Key Classes Explained

### Overlay Container
- `fixed inset-0`: Cover entire viewport
- `z-[100]`: Ensure modal appears above header (z-30) and sidebar (z-40)
- `flex items-start md:items-center`: Start from top on mobile, center on desktop
- `py-20 md:py-8`: Vertical padding (80px mobile, 32px desktop) to avoid header cutoff
- `px-4`: Horizontal padding
- `overflow-y-auto`: Allow scrolling when modal is taller than viewport
- `bg-black/50`: Semi-transparent backdrop
- `backdrop-blur-sm`: Blur effect on backdrop

### Modal Container
- `max-w-2xl`: Maximum width (adjust as needed: xl, lg, md, sm)
- `max-h-[85vh]`: Maximum height 85% of viewport
- `flex flex-col`: Allow flex-based content layout
- `rounded-xl`: Rounded corners
- `animate-in fade-in zoom-in-95`: Entrance animation

### Content Area
- `overflow-y-auto flex-1`: Scrollable content area that fills available space
- `shrink-0`: Header and footer don't shrink

## Important Notes

1. **Always use `z-[100]`** for modal overlays to ensure they appear above the sticky header
2. **Use `py-20 md:py-8`** padding to provide gap from header
3. **Use `items-start md:items-center`** for proper mobile/desktop alignment
4. **Include `overflow-y-auto`** on overlay for very tall modals
5. **Use `max-h-[85vh]`** to prevent modal from being too tall

## Example Implementation

See existing implementations in:
- `src/components/log-activity/log-activity-manager.tsx`
- `src/components/assets/asset-manager.tsx`
- `src/components/service-robot/service-robot-manager.tsx`
