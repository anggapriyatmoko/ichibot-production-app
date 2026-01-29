# Modal Component Guidelines

## Z-Index Hierarchy

Modal dialogs MUST use the following z-index to ensure they appear above all other UI elements:

| Element Type | Z-Index | Description |
|-------------|---------|-------------|
| Header | `z-30` | Sticky header at top |
| Sidebar | `z-40` | Navigation sidebar |
| **Modal Overlay** | **`z-[100]`** | Modal background and container |
| Chat Widget | `z-50` | Floating chat button |

## Modal Template (Mobile-Friendly)

When creating a new modal, use this template which provides a centered modal with dark overlay visible on all sides:

```tsx
// Add this useEffect to lock body scroll when modal is open
useEffect(() => {
    if (isModalOpen) {
        document.body.style.overflow = 'hidden'
    } else {
        document.body.style.overflow = ''
    }
    return () => {
        document.body.style.overflow = ''
    }
}, [isModalOpen])

{isModalOpen && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-border shrink-0">
                <h3 className="text-lg font-semibold">Modal Title</h3>
            </div>
            
            {/* Modal Content - Scrollable */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
                {/* Your content here */}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 md:p-6 border-t border-border shrink-0 flex justify-end gap-3">
                <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Batal
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors">
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
- `flex items-center justify-center`: Center modal both vertically and horizontally
- `p-4`: Padding on all sides to provide gap from screen edges (ensures rounded corners are visible)
- `bg-black/60`: Semi-transparent dark backdrop visible on all sides
- `backdrop-blur-sm`: Blur effect on backdrop

### Modal Container
- `rounded-2xl`: Rounded corners on all sides
- `max-h-[90vh]`: Maximum height 90% of viewport to ensure modal fits on screen
- `flex flex-col`: Allow flex-based content layout
- `animate-in zoom-in-95`: Zoom entrance animation

### Content Area
- `p-4 md:p-6`: Smaller padding on mobile, larger on desktop
- `overflow-y-auto flex-1`: Scrollable content area that fills available space
- `shrink-0`: Header and footer don't shrink

### Body Scroll Lock
Always add a useEffect to lock body scroll when modal is open:
```tsx
useEffect(() => {
    if (isModalOpen) {
        document.body.style.overflow = 'hidden'
    } else {
        document.body.style.overflow = ''
    }
    return () => {
        document.body.style.overflow = ''
    }
}, [isModalOpen])
```

## Important Notes

1. **Always use `z-[100]`** for modal overlays to ensure they appear above the sticky header
2. **Always lock body scroll** when modal is open to prevent background scrolling
3. **Use `items-end md:items-center`** for bottom-sheet on mobile, centered on desktop
4. **Use `rounded-t-2xl md:rounded-xl`** to show all corners properly
5. **Use `max-h-[90vh] md:max-h-[85vh]`** to prevent modal from being too tall
6. **Only the modal content should scroll**, not the page behind it

## Example Implementation

See existing implementations in:
- `src/components/inventory/product-list.tsx`
- `src/components/log-activity/log-activity-manager.tsx`
- `src/components/assets/asset-manager.tsx`
- `src/components/service-robot/service-robot-manager.tsx`
