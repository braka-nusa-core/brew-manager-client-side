// src/features/employee/components/EmployeeTableSkeleton.jsx
// Loading skeleton for the employee table.
// Shows placeholder rows while data is fetching.

import { cn } from '@/lib/utils'

const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse bg-muted rounded', className)} />
)

/**
 * @param {{ rows?: number }} props
 */
const EmployeeTableSkeleton = ({ rows = 8 }) => (
  <div className="w-full overflow-x-auto rounded-lg border border-border">
    <table className="w-full text-sm">
      <thead className="bg-muted/50 border-b border-border">
        <tr>
          {['Employee', 'Position', 'Outlet', 'Salary', 'Join Date', 'Status', ''].map((h) => (
            <th
              key={h}
              className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>

      <tbody className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="bg-card">
            {/* Employee name + email */}
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </td>
            {/* Position */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-20" /></td>
            {/* Outlet */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-24" /></td>
            {/* Salary */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-28" /></td>
            {/* Join date */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-20" /></td>
            {/* Status */}
            <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
            {/* Actions */}
            <td className="px-4 py-3"><Skeleton className="h-7 w-7 rounded-md ml-auto" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default EmployeeTableSkeleton