import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// ── Глобальный запрет копирования текста на всём сайте ──────────────
// Блокируем copy/cut/контекстное меню/перетаскивание. Исключение — поля
// ввода (логин, админ-формы): там копирование/вставка должны работать.
function isEditable(el: EventTarget | null): boolean {
  return (
    el instanceof HTMLElement &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable)
  )
}
for (const type of ['copy', 'cut', 'contextmenu', 'dragstart'] as const) {
  document.addEventListener(
    type,
    (e) => {
      if (!isEditable(e.target)) e.preventDefault()
    },
    { capture: true },
  )
}

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
