// src/features/user/components/UserTableSkeleton.jsx
import { cn } from '@/lib/utils'
const Sk = ({ className }) => <div className={cn('animate-pulse bg-muted rounded', className)} />

const UserTableSkeleton = ({ rows = 8 }) => (
  <div className="w-full overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-muted/50 border-b border-border">
        <tr>
          {['Name / Email', 'Role', 'Outlet', 'Status', ''].map((h) => (
            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="bg-card">
            <td className="px-4 py-3">
              <div className="space-y-1.5">
                <Sk className="h-3.5 w-32" />
                <Sk className="h-3 w-40" />
              </div>
            </td>
            <td className="px-4 py-3"><Sk className="h-5 w-20 rounded-full" /></td>
            <td className="px-4 py-3"><Sk className="h-3.5 w-24" /></td>
            <td className="px-4 py-3"><Sk className="h-5 w-16 rounded-full" /></td>
            <td className="px-4 py-3"><Sk className="h-7 w-7 rounded-md ml-auto" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default UserTableSkeleton