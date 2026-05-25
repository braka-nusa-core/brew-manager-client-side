// src/features/attendance/components/AttendanceTableSkeleton.jsx
// Loading skeleton matching the attendance table column layout.

import { cn } from '@/lib/utils'

const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse bg-muted rounded', className)} />
)

/**
 * @param {{ rows?: number }} props
 */
const AttendanceTableSkeleton = ({ rows = 10 }) => (
  <div className="w-full overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-muted/50 border-b border-border">
        <tr>
          {['Employee', 'Date', 'Status', 'Outlet', 'Notes', 'Recorded By', ''].map((h) => (
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
            {/* Employee */}
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            </td>
            {/* Date */}
            <td className="px-4 py-3">
              <Skeleton className="h-3.5 w-24" />
            </td>
            {/* Status */}
            <td className="px-4 py-3">
              <Skeleton className="h-5 w-16 rounded-full" />
            </td>
            {/* Outlet */}
            <td className="px-4 py-3">
              <Skeleton className="h-3.5 w-20" />
            </td>
            {/* Notes */}
            <td className="px-4 py-3">
              <Skeleton className="h-3.5 w-32" />
            </td>
            {/* Recorded by */}
            <td className="px-4 py-3">
              <Skeleton className="h-3.5 w-24" />
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

export default AttendanceTableSkeleton