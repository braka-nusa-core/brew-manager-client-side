import { Link } from 'react-router-dom'

const NotFoundPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-8">
    <p className="text-7xl font-bold text-brand-500 mb-4">404</p>
    <h1 className="text-2xl font-semibold text-foreground mb-2">Page not found</h1>
    <p className="text-sm text-muted-foreground mb-6">
      The page you're looking for doesn't exist or has been moved.
    </p>
    <Link
      to="/dashboard"
      className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-brand-950 font-medium text-sm rounded-md transition-colors"
    >
      Back to dashboard
    </Link>
  </div>
)

export default NotFoundPage
