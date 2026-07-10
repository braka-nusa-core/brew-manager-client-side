// src/features/bikeMaintenance/components/MaintenanceTableSkeleton.jsx

import { cn } from '@/lib/utils'

const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse bg-muted rounded', className)} />
)

const HEADERS = {
  damage: ['Bike', 'Type', 'Severity', 'Status', 'Reported', 'Notes', ''],
  repair: ['Damage Report', 'Repair Date', 'Cost', 'Status', 'Notes', ''],
}

const MaintenanceTableSkeleton = ({ rows = 6, variant = 'damage' }) => (
  <div className="w-full overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-muted/50 border-b border-border">
        <tr>
          {HEADERS[variant].map((h) => (
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
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-28" /></td>
            <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-md" /></td>
            <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
            <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-20" /></td>
            {variant === 'damage' && (
              <td className="px-4 py-3"><Skeleton className="h-3.5 w-28" /></td>
            )}
            <td className="px-4 py-3"><Skeleton className="h-7 w-7 rounded-md ml-auto" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default MaintenanceTableSkeleton