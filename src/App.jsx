// src/App.jsx
import { useEffect, useRef }                from 'react'
import { RouterProvider }                   from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools }               from '@tanstack/react-query-devtools'
import router                               from '@/router'
import { useInitAuth }                      from '@/features/auth/hooks/useAuth'
import ToastContainer                       from '@/components/shared/ToastContainer'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           1000 * 60 * 5,
      retry:               1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
})

// AuthInitializer runs the session-rehydration check exactly ONCE
// on app mount. Using useRef to hold the initialize function reference
// prevents re-running if the component re-renders before the async
// initialize() call resolves.
const AuthInitializer = ({ children }) => {
  const { initialize } = useInitAuth()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    initialize()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return children
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthInitializer>
      <RouterProvider router={router} />
      <ToastContainer />
    </AuthInitializer>
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
)

export default App