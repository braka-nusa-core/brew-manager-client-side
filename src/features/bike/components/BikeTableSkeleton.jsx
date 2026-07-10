// src/features/bike/components/BikeTableSkeleton.jsx
// Loading skeleton — mirrors CupRecordTableSkeleton pattern.

import { cn } from '@/lib/utils'

const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse bg-muted rounded', className)} />
)

const BikeTableSkeleton = ({ rows = 8 }) => (
  <div className="w-full overflow-x-auto rounded-lg border border-border">
    <table className="w-full text-sm">
      <thead className="bg-muted/50 border-b border-border">
        <tr>
          {['Asset Code', 'Name', 'Outlet', 'Status', 'Active', 'Notes', ''].map((h) => (
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
            <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-md" /></td>
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-32" /></td>
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-24" /></td>
            <td className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
            <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-28" /></td>
            <td className="px-4 py-3"><Skeleton className="h-7 w-7 rounded-md ml-auto" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default BikeTableSkeleton