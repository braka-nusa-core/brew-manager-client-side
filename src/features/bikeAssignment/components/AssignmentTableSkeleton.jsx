// src/features/bikeAssignment/components/AssignmentTableSkeleton.jsx
// Loading skeleton — configurable for active (5 cols) and history (6 cols).

import { cn } from '@/lib/utils'

const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse bg-muted rounded', className)} />
)

/**
 * @param {{ rows?: number, variant?: 'active'|'history' }} props
 */
const AssignmentTableSkeleton = ({ rows = 6, variant = 'active' }) => {
  const headers = variant === 'history'
    ? ['Asset Code', 'Bike', 'Rider', 'Start Date', 'End Date', 'Status', '']
    : ['Asset Code', 'Bike', 'Rider', 'Start Date', '']

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            {headers.map((h) => (
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
              <td className="px-4 py-3"><Skeleton className="h-3.5 w-28" /></td>
              <td className="px-4 py-3"><Skeleton className="h-3.5 w-24" /></td>
              <td className="px-4 py-3"><Skeleton className="h-3.5 w-20" /></td>
              {variant === 'history' && (
                <>
                  <td className="px-4 py-3"><Skeleton className="h-3.5 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                </>
              )}
              <td className="px-4 py-3">
                {variant === 'active' && <Skeleton className="h-7 w-16 rounded-md ml-auto" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default AssignmentTableSkeleton