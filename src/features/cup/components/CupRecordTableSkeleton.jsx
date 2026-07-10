// src/features/cup/components/CupRecordTableSkeleton.jsx
// Loading skeleton for the cup record table.
// Shows placeholder rows while data is fetching.
// Mirrors EmployeeTableSkeleton pattern exactly.

import { cn } from '@/lib/utils'

const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse bg-muted rounded', className)} />
)

/**
 * @param {{ rows?: number }} props
 */
const CupRecordTableSkeleton = ({ rows = 8 }) => (
  <div className="w-full overflow-x-auto rounded-lg border border-border">
    <table className="w-full text-sm">
      <thead className="bg-muted/50 border-b border-border">
        <tr>
          {['Rider', 'Date', 'Products', 'Balance', 'Status', 'Notes', ''].map((h) => (
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
            {/* Rider name */}
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </td>
            {/* Date */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-24" /></td>
            {/* Products count */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-16" /></td>
            {/* Balance */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-20" /></td>
            {/* Status */}
            <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
            {/* Notes */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-32" /></td>
            {/* Actions */}
            <td className="px-4 py-3"><Skeleton className="h-7 w-7 rounded-md ml-auto" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default CupRecordTableSkeleton