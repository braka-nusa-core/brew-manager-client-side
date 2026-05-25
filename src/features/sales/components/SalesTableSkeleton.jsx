// src/features/sales/components/SalesTableSkeleton.jsx
// Loading skeleton matching the sales table column layout.
// Mirrors the AttendanceTableSkeleton pattern — pulse divs per column.

import { cn } from '@/lib/utils'

const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse bg-muted rounded', className)} />
)

/**
 * @param {{ rows?: number }} props
 */
const SalesTableSkeleton = ({ rows = 10 }) => (
  <div className="w-full overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-muted/50 border-b border-border">
        <tr>
          {['Date & Time', 'Amount', 'Payment', 'Employee', 'Outlet', 'Notes', ''].map((h) => (
            <th
              key={h}
              className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>

      <tbody className="divide-y divide-border bg-card">
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            {/* Date & Time */}
            <td className="px-4 py-3">
              <Skeleton className="h-3.5 w-28 mb-1.5" />
              <Skeleton className="h-3 w-16" />
            </td>
            {/* Amount */}
            <td className="px-4 py-3">
              <Skeleton className="h-4 w-24" />
            </td>
            {/* Payment method */}
            <td className="px-4 py-3">
              <Skeleton className="h-5 w-16 rounded-full" />
            </td>
            {/* Employee */}
            <td className="px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </td>
            {/* Outlet */}
            <td className="px-4 py-3">
              <Skeleton className="h-3.5 w-20" />
            </td>
            {/* Notes */}
            <td className="px-4 py-3">
              <Skeleton className="h-3.5 w-32" />
            </td>
            {/* Actions */}
            <td className="px-4 py-3">
              <Skeleton className="h-7 w-7 rounded-md ml-auto" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default SalesTableSkeleton