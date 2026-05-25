// src/features/payroll/components/PayrollTableSkeleton.jsx
import { cn } from '@/lib/utils'

const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse bg-muted rounded', className)} />
)

const PayrollTableSkeleton = ({ rows = 8 }) => (
  <div className="w-full overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-muted/50 border-b border-border">
        <tr>
          {['Employee', 'Period', 'Attendance', 'Salary', 'Bonus', 'Total Pay', 'Status', ''].map((h) => (
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
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </td>
            {/* Period */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-24" /></td>
            {/* Attendance */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-16" /></td>
            {/* Salary */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-28" /></td>
            {/* Bonus */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-20" /></td>
            {/* Total Pay */}
            <td className="px-4 py-3"><Skeleton className="h-3.5 w-28" /></td>
            {/* Status */}
            <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
            {/* Actions */}
            <td className="px-4 py-3"><Skeleton className="h-7 w-7 rounded-md ml-auto" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default PayrollTableSkeleton