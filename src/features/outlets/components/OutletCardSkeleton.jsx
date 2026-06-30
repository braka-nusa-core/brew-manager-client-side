// src/features/outlet/components/OutletCardSkeleton.jsx
import { cn } from '@/lib/utils'

const Sk = ({ className }) => (
  <div className={cn('animate-pulse bg-muted rounded', className)} />
)

const OutletCardSkeleton = () => (
  <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <Sk className="w-10 h-10 rounded-xl shrink-0" />
        <div className="space-y-2">
          <Sk className="h-4 w-32" />
          <Sk className="h-3 w-16" />
        </div>
      </div>
      <Sk className="w-7 h-7 rounded-md" />
    </div>

    <div className="space-y-2 flex-1">
      <Sk className="h-3 w-full" />
      <Sk className="h-3 w-3/4" />
      <Sk className="h-3 w-24 mt-1" />
    </div>

    <div className="flex items-center justify-between pt-3 border-t border-border">
      <Sk className="h-5 w-16 rounded-full" />
      <Sk className="h-3 w-20" />
    </div>
  </div>
)

// Grid of skeletons
const OutletCardSkeletonGrid = ({ count = 6 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <OutletCardSkeleton key={i} />
    ))}
  </div>
)

export default OutletCardSkeletonGrid