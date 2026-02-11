'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, ChevronDown, Search, X } from 'lucide-react'

// ============================================================================
// TABLE WRAPPER - Container with overflow handling
// ============================================================================
interface TableWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Show loading overlay */
    loading?: boolean
    /** Card style with border and rounded corners */
    card?: boolean
}

const TableWrapper = React.forwardRef<HTMLDivElement, TableWrapperProps>(
    ({ className, loading, card = true, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "relative flex flex-col",
                card && "bg-card border border-border rounded-xl overflow-hidden shadow-sm",
                className
            )}
            {...props}
        >
            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            )}
            {children}
        </div>
    )
)
TableWrapper.displayName = 'TableWrapper'

// ============================================================================
// TABLE SCROLL AREA - Handles horizontal scroll, prevents vertical scroll
// ============================================================================
interface TableScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Minimum height to prevent layout jump */
    minHeight?: string
}

const TableScrollArea = React.forwardRef<HTMLDivElement, TableScrollAreaProps>(
    ({ className, minHeight = "400px", ...props }, ref) => (
        <div
            ref={ref}
            style={{ minHeight }}
            className={cn(
                "overflow-x-auto",
                className
            )}
            {...props}
        />
    )
)
TableScrollArea.displayName = 'TableScrollArea'

// ============================================================================
// TABLE - Base table element
// ============================================================================
const Table = React.forwardRef<
    HTMLTableElement,
    React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
    <table
        ref={ref}
        className={cn("w-full text-left border-collapse", className)}
        {...props}
    />
))
Table.displayName = 'Table'

// ============================================================================
// TABLE HEADER - <thead> element
// ============================================================================
const TableHeader = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <thead
        ref={ref}
        className={cn(
            "bg-muted/50 border-b border-border",
            className
        )}
        {...props}
    />
))
TableHeader.displayName = 'TableHeader'

// ============================================================================
// TABLE HEADER CONTENT - Title, description, and actions section
// ============================================================================
export interface TableHeaderContentProps {
    /** Main title of the table */
    title: React.ReactNode
    /** Optional description or sub-title */
    description?: React.ReactNode
    /** Optional icon to lead the title */
    icon?: React.ReactNode
    /** Optional actions (buttons, search, filters) to display on the right */
    actions?: React.ReactNode
    /** Custom class name */
    className?: string
}

export const TableHeaderContent = ({
    title,
    description,
    icon,
    actions,
    className
}: TableHeaderContentProps) => (
    <div className={cn(
        "px-6 py-5 flex flex-col gap-5 border-b border-border bg-muted/20 transition-all duration-300",
        className
    )}>
        {/* Top Row: Icon + Title + Mobile Search Button */}
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
                {icon && (
                    <div className="p-2.5 bg-background border border-border rounded-xl text-primary shadow-sm mt-0.5 transition-transform hover:scale-105">
                        {icon}
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-bold text-foreground leading-tight tracking-tight">{title}</h3>
                    {description && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2 sm:line-clamp-none">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            {/* Mobile-only Search Button (Decorative/Functional focal point) */}
            <div className="sm:hidden">
                <button className="p-2.5 rounded-xl border bg-background text-primary border-border shadow-sm hover:border-primary/50 active:scale-95 transition-all">
                    <Search className="w-5 h-5" />
                </button>
            </div>

            {/* Desktop Actions (Right-aligned) */}
            {actions && (
                <div className="hidden sm:flex items-center gap-3">
                    {actions}
                </div>
            )}
        </div>

        {/* Mobile Actions: Always visible, stacked vertically below title section */}
        {actions && (
            <div className="sm:hidden flex flex-col gap-3">
                {actions}
            </div>
        )}
    </div>
)
TableHeaderContent.displayName = 'TableHeaderContent'

// ============================================================================
// TABLE BODY - <tbody> element
// ============================================================================
const TableBody = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <tbody
        ref={ref}
        className={cn("divide-y divide-border", className)}
        {...props}
    />
))
TableBody.displayName = 'TableBody'

// ============================================================================
// TABLE FOOTER - <tfoot> element
// ============================================================================
const TableFooter = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <tfoot
        ref={ref}
        className={cn(
            "bg-muted/30 border-t border-border font-medium",
            className
        )}
        {...props}
    />
))
TableFooter.displayName = 'TableFooter'

// ============================================================================
// TABLE ROW - <tr> element
// ============================================================================
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    /** Add hover effect */
    hoverable?: boolean
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
    ({ className, hoverable = true, ...props }, ref) => (
        <tr
            ref={ref}
            className={cn(
                "transition-colors",
                hoverable && "hover:bg-accent/50 group",
                className
            )}
            {...props}
        />
    )
)
TableRow.displayName = 'TableRow'

// ============================================================================
// TABLE HEAD - <th> element (header cell)
// ============================================================================
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    /** Text alignment */
    align?: 'left' | 'center' | 'right'
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
    ({ className, align = 'left', children, ...props }, ref) => (
        <th
            ref={ref}
            className={cn(
                "px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                align === 'center' && "text-center",
                align === 'right' && "text-right",
                className
            )}
            {...props}
        >
            <div className={cn(
                "flex items-center gap-1",
                align === 'center' && "justify-center",
                align === 'right' && "justify-end"
            )}>
                {children}
            </div>
        </th>
    )
)
TableHead.displayName = 'TableHead'

// ============================================================================
// TABLE CELL - <td> element
// ============================================================================
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
    /** Text alignment */
    align?: 'left' | 'center' | 'right'
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
    ({ className, align = 'left', ...props }, ref) => (
        <td
            ref={ref}
            className={cn(
                "px-4 py-3 text-sm",
                align === 'center' && "text-center",
                align === 'right' && "text-right",
                className
            )}
            {...props}
        />
    )
)
TableCell.displayName = 'TableCell'

// ============================================================================
// TABLE CAPTION - <caption> element
// ============================================================================
const TableCaption = React.forwardRef<
    HTMLTableCaptionElement,
    React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
    <caption
        ref={ref}
        className={cn("mt-4 text-sm text-muted-foreground", className)}
        {...props}
    />
))
TableCaption.displayName = 'TableCaption'

// ============================================================================
// TABLE EMPTY - Empty state placeholder
// ============================================================================
interface TableEmptyProps {
    /** Number of columns to span */
    colSpan: number
    /** Message to display */
    message?: string
    /** Icon to display */
    icon?: React.ReactNode
    /** Description or call to action */
    description?: React.ReactNode
}

const TableEmpty = ({ colSpan, message = "Tidak ada data ditemukan.", icon, description }: TableEmptyProps) => (
    <tr>
        <td colSpan={colSpan} className="px-4 py-24 text-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                {icon}
                <p className="text-sm font-medium">{message}</p>
                {description && <div className="text-xs">{description}</div>}
            </div>
        </td>
    </tr>
)
TableEmpty.displayName = 'TableEmpty'

// ============================================================================
// TABLE LOADING - Loading skeleton rows
// ============================================================================
interface TableLoadingProps {
    /** Number of columns to span */
    colSpan: number
    /** Number of skeleton rows */
    rows?: number
}

const TableLoading = ({ colSpan, rows = 5 }: TableLoadingProps) => (
    <>
        {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
                <td colSpan={colSpan} className="px-4 py-3">
                    <div className="h-5 bg-muted/60 rounded animate-pulse" />
                </td>
            </tr>
        ))}
    </>
)
TableLoading.displayName = 'TableLoading'

// ============================================================================
// TABLE PAGINATION - Premium Pagination Controls
// ============================================================================
interface TablePaginationProps {
    /** Current page (1-indexed) */
    currentPage: number
    /** Total number of pages */
    totalPages: number
    /** Callback when page changes */
    onPageChange: (page: number) => void
    /** Items per page selection */
    itemsPerPage?: number
    /** Callback when items per page changes */
    onItemsPerPageChange?: (count: number) => void
    /** Allowed items per page options */
    pageSizeOptions?: number[]
    /** Total items count */
    totalCount?: number
}

const TablePagination = ({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    onItemsPerPageChange,
    pageSizeOptions = [10, 20, 50, 100],
    totalCount
}: TablePaginationProps) => {
    const [pageInput, setPageInput] = React.useState(currentPage.toString())

    React.useEffect(() => {
        setPageInput(currentPage.toString())
    }, [currentPage])

    if (totalPages <= 0) return null

    const startIndex = (currentPage - 1) * (itemsPerPage || 0)
    const endIndex = Math.min(startIndex + (itemsPerPage || 0), totalCount || 0)

    const handlePageSubmit = () => {
        const val = parseInt(pageInput)
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
            onPageChange(val)
        } else {
            setPageInput(currentPage.toString())
        }
    }

    return (
        <div className="px-4 py-3 sm:py-4 border-t border-border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs">
            {/* Left side: Stats */}
            <div className="flex items-center justify-center sm:justify-start w-full sm:w-auto order-2 sm:order-1">
                {totalCount !== undefined && totalCount > 0 && (
                    <div className="text-muted-foreground whitespace-nowrap font-normal">
                        <span className="hidden sm:inline mr-1">Menampilkan</span>
                        <span className="sm:hidden mr-1">Menampilkan</span>
                        <span className="font-bold text-foreground">{startIndex + 1}</span>
                        <span className="mx-1 font-normal">-</span>
                        <span className="font-bold text-foreground">{endIndex}</span>
                        <span className="mx-1">dari</span>
                        <span className="font-bold text-foreground">{totalCount}</span>
                    </div>
                )}
            </div>

            {/* Right side: Selection & Navigation controls */}
            <div className="flex flex-wrap items-center justify-center w-full sm:w-auto gap-4 sm:gap-8 order-1 sm:order-2 pb-2 sm:pb-0 border-b sm:border-0 border-border/50">
                {onItemsPerPageChange && itemsPerPage !== undefined && (
                    <div className="flex items-center gap-1 group font-normal">
                        <span className="text-muted-foreground whitespace-nowrap text-xs">
                            <span className="hidden lg:inline">Baris per halaman:</span>
                            <span className="lg:hidden">Baris per hal:</span>
                        </span>
                        <div className="relative flex items-center">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                                className="appearance-none bg-transparent pl-1 pr-4 py-0.5 text-xs font-bold text-foreground outline-none cursor-pointer transition-colors hover:text-primary group-hover:text-primary"
                            >
                                {pageSizeOptions.map(option => (
                                    <option key={option} value={option} className="bg-background text-foreground">{option}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-0 text-muted-foreground pointer-events-none transition-colors group-hover:text-primary" />
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
                        title="Halaman Sebelumnya"
                    >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-active:scale-90" style={{ strokeWidth: 3 }} />
                    </button>

                    <div className="flex items-center gap-1 font-normal">
                        <span className="text-muted-foreground text-xs">Halaman</span>
                        <input
                            type="text"
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
                            onBlur={handlePageSubmit}
                            onKeyDown={(e) => e.key === 'Enter' && handlePageSubmit()}
                            style={{ width: `${Math.max(pageInput.length, 1) + 1.5}ch` }}
                            className="h-7 p-0 text-center text-xs font-bold bg-transparent hover:bg-background/50 border border-transparent hover:border-border rounded focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all cursor-text"
                        />
                        <span className="text-muted-foreground text-xs font-normal">dari <span className="text-foreground font-bold">{totalPages}</span></span>
                    </div>

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
                        title="Halaman Selanjutnya"
                    >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-active:scale-90" style={{ strokeWidth: 3 }} />
                    </button>
                </div>
            </div>
        </div>
    )
}
TablePagination.displayName = 'TablePagination'

// ============================================================================
// EXPORTS
// ============================================================================
export {
    TableWrapper,
    TableScrollArea,
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
    TableCaption,
    TableEmpty,
    TableLoading,
    TablePagination,
}
