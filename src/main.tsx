import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Админка грузится отдельным чанком — она не нужна агентам.
const AdminApp = lazy(() => import('./admin/AdminApp.tsx'))

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  {
    path: '/admin',
    element: (
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Загрузка…</div>}>
        <AdminApp />
      </Suspense>
    ),
  },
  // Любой другой путь — назад в приложение агента.
  { path: '*', element: <App /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
