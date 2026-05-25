// src/components/shared/DataTable.jsx
import { cn } from '@/lib/utils'

const DataTable = ({ children, className }) => (
  <div className={cn('w-full overflow-x-auto', className)}>
    <table className="w-full text-sm">{children}</table>
  </div>
)

const Head = ({ children }) => (
  <thead className="bg-muted/50 border-b border-border">{children}</thead>
)

const HeadRow = ({ children }) => <tr>{children}</tr>

const HeadCell = ({ children, className }) => (
  <th className={cn(
    'px-4 py-3 text-left text-xs font-medium text-muted-foreground',
    'uppercase tracking-wide whitespace-nowrap select-none',
    className
  )}>
    {children}
  </th>
)

const Body = ({ children }) => (
  <tbody className="divide-y divide-border bg-card">{children}</tbody>
)

const Row = ({ children, className, onClick }) => (
  <tr
    onClick={onClick}
    className={cn(
      'transition-colors',
      onClick && 'cursor-pointer hover:bg-muted/30',
      className
    )}
  >
    {children}
  </tr>
)

const Cell = ({ children, className }) => (
  <td className={cn('px-4 py-3 text-foreground align-middle', className)}>
    {children}
  </td>
)

DataTable.Head     = Head
DataTable.HeadRow  = HeadRow
DataTable.HeadCell = HeadCell
DataTable.Body     = Body
DataTable.Row      = Row
DataTable.Cell     = Cell

export default DataTable