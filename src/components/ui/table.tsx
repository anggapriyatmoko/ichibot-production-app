'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

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
                "relative",
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
    /** Hide on mobile, show on md+ screens */
    desktopOnly?: boolean
}

const TableScrollArea = React.forwardRef<HTMLDivElement, TableScrollAreaProps>(
    ({ className, desktopOnly, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "overflow-x-auto overflow-y-hidden",
                desktopOnly && "hidden md:block",
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
        className={cn("w-full text-left text-sm", className)}
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
            "bg-muted text-muted-foreground uppercase font-normal text-xs",
            className
        )}
        {...props}
    />
))
TableHeader.displayName = 'TableHeader'

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
            "bg-muted/80 border-t-2 border-primary/30 font-medium",
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
                hoverable && "hover:bg-accent/50",
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
    /** Make column sortable (visual indicator) */
    sortable?: boolean
    /** Current sort direction */
    sorted?: 'asc' | 'desc' | false
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
    ({ className, align = 'left', sortable, sorted, children, ...props }, ref) => (
        <th
            ref={ref}
            className={cn(
                "px-4 py-3 font-medium",
                align === 'center' && "text-center",
                align === 'right' && "text-right",
                sortable && "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none",
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
                {sortable && sorted && (
                    <span className="text-xs">
                        {sorted === 'asc' ? '↑' : '↓'}
                    </span>
                )}
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
    /** Truncate long text */
    truncate?: boolean
    /** Use monospace font */
    mono?: boolean
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
    ({ className, align = 'left', truncate, mono, ...props }, ref) => (
        <td
            ref={ref}
            className={cn(
                "px-4 py-3",
                align === 'center' && "text-center",
                align === 'right' && "text-right",
                truncate && "truncate max-w-[200px]",
                mono && "font-mono text-xs",
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
}

const TableEmpty = ({ colSpan, message = "No data found.", icon }: TableEmptyProps) => (
    <tr>
        <td colSpan={colSpan} className="px-6 py-12 text-center text-muted-foreground">
            {icon && <div className="flex justify-center mb-3">{icon}</div>}
            {message}
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

const TableLoading = ({ colSpan, rows = 3 }: TableLoadingProps) => (
    <>
        {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
                <td colSpan={colSpan} className="px-4 py-3">
                    <div className="h-4 bg-muted/50 rounded animate-pulse" />
                </td>
            </tr>
        ))}
    </>
)
TableLoading.displayName = 'TableLoading'

// ============================================================================
// TABLE PAGINATION - Pagination controls
// ============================================================================
interface TablePaginationProps {
    /** Current page (1-indexed) */
    currentPage: number
    /** Total number of pages */
    totalPages: number
    /** Callback when page changes */
    onPageChange: (page: number) => void
    /** Show item count info */
    showInfo?: boolean
    /** Current items count */
    currentCount?: number
    /** Total items count */
    totalCount?: number
}

const TablePagination = ({
    currentPage,
    totalPages,
    onPageChange,
    showInfo = true,
    currentCount,
    totalCount
}: TablePaginationProps) => {
    if (totalPages <= 1) return null

    return (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/20">
            {showInfo && (
                <p className="text-sm text-muted-foreground">
                    {currentCount && totalCount ? (
                        <>Showing <span className="text-foreground font-medium">{currentCount}</span> of <span className="text-foreground font-medium">{totalCount}</span></>
                    ) : (
                        <>Page <span className="text-foreground font-medium">{currentPage}</span> of <span className="text-foreground font-medium">{totalPages}</span></>
                    )}
                </p>
            )}
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors rounded-lg hover:bg-muted"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors rounded-lg hover:bg-muted"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
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
