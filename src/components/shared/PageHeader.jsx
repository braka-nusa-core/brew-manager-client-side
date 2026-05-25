import { cn } from '@/lib/utils'

/**
 * Consistent page header used at the top of every page.
 *
 * @param {{ title: string, description?: string, children?: React.ReactNode, className?: string }} props
 */
const PageHeader = ({ title, description, children, className }) => (
  <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
    </div>
    {children && (
      <div className="flex items-center gap-2 shrink-0">
        {children}
      </div>
    )}
  </div>
)

export default PageHeader
