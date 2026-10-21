import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import './index.css'
import { I18nProvider } from './i18n.jsx'
import { SessionProvider } from './session.jsx'
import SiteLayout from './site/SiteLayout.jsx'
import Landing from './pages/Landing.jsx'
import Therm from './pages/Therm.jsx'
import Feed from './site/Feed.jsx'
import { BlogPage, BlogPostPage, BlogList, BlogPostBody } from './pages/Blog.jsx'
import AppShell from './app/AppShell.jsx'
import EventsTab, { EventDetail } from './app/EventsTab.jsx'
import Invoice from './app/Invoice.jsx'
import TicketView from './app/TicketView.jsx'
import Yoga from './app/Yoga.jsx'
import Learn from './app/Learn.jsx'
import Work from './app/Work.jsx'
import Gifts from './app/Gifts.jsx'
import Submissions from './app/Submissions.jsx'
import { useI18n } from './i18n.jsx'

function KeepHash({ to }) {
  const { hash, search } = useLocation()
  return <Navigate to={`${to}${search}${hash}`} replace />
}

function AppBlog() {
  const { t } = useI18n()
  return (
    <div className="space-y-6">
      <h1 className="text-liquid text-3xl font-bold tracking-tight">{t('blog.title')}</h1>
      <BlogList base="/app/blog" />
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={window.location.origin + import.meta.env.BASE_URL + 'tonconnect-manifest.json'}>
      <I18nProvider>
      <SessionProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
            </Route>
            <Route path="/therm" element={<KeepHash to="/app/therm" />} />
            <Route path="/feed" element={<KeepHash to="/app/feed" />} />
            <Route path="/projects" element={<KeepHash to="/app/therm" />} />
            <Route path="/ticket/:qr" element={<TicketView />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="/app/events" replace />} />
              <Route path="learn" element={<Learn />} />
              <Route path="work" element={<Work />} />
              <Route path="blog" element={<AppBlog />} />
              <Route path="blog/:slug" element={<BlogPostBody base="/app/blog" />} />
              <Route path="therm" element={<Therm />} />
              <Route path="feed" element={<Feed />} />
              <Route path="projects" element={<Navigate to="/app/therm" replace />} />
              <Route path="events" element={<EventsTab />} />
              <Route path="submissions" element={<Submissions />} />
              <Route path="event/:slug" element={<EventDetail />} />
              <Route path="yoga" element={<Yoga />} />
              <Route path="gifts" element={<Gifts />} />
              <Route path="invoice/:id" element={<Invoice />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
      </I18nProvider>
    </TonConnectUIProvider>
  </StrictMode>
)
