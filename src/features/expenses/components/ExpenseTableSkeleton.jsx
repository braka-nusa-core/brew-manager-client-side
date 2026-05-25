// src/features/expenses/components/ExpenseTableSkeleton.jsx
// Pulse skeleton matching the expenses table column layout:
//   Date | Category | Description | Amount | Outlet | Actions

import { cn } from '@/lib/utils'

const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse bg-muted rounded', className)} />
)

const ExpenseTableSkeleton = ({ rows = 10 }) => (
  <div className="w-full overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-muted/50 border-b border-border">
        <tr>
          {['Date', 'Category', 'Description', 'Amount', 'Outlet', ''].map((h) => (
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
            {/* Date */}
            <td className="px-4 py-3">
              <Skeleton className="h-3.5 w-24" />
            </td>
            {/* Category badge */}
            <td className="px-4 py-3">
              <Skeleton className="h-5 w-24 rounded-full" />
            </td>
            {/* Description */}
            <td className="px-4 py-3">
              <Skeleton className="h-3.5 w-40" />
            </td>
            {/* Amount */}
            <td className="px-4 py-3">
              <Skeleton className="h-4 w-24" />
            </td>
            {/* Outlet */}
            <td className="px-4 py-3 hidden lg:table-cell">
              <Skeleton className="h-3.5 w-20" />
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

export default ExpenseTableSkeleton