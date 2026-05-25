import PageHeader    from '@/components/shared/PageHeader'
import { Construction } from 'lucide-react'

/**
 * Placeholder page for modules not yet implemented.
 * Allows sidebar navigation to work immediately.
 *
 * @param {{ title: string }} props
 */
const PlaceholderPage = ({ title }) => (
  <div>
    <PageHeader title={title} />
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-card border border-border rounded-xl">
      <Construction className="w-10 h-10 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-medium text-foreground">{title} module</p>
      <p className="text-xs text-muted-foreground mt-1">
        This module is under development
      </p>
    </div>
  </div>
)

export default PlaceholderPage
