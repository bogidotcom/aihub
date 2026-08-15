import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Leaf } from 'lucide-react'
import { marked } from 'marked'
import { ThemeFrame } from '../theme.jsx'
import { Glass, Reveal, Spinner } from '../ui.jsx'
import { api } from '../api.js'
import { useI18n, LangSwitcher } from '../i18n.jsx'
import { media } from '../media.js'

const coverIsImage = (cover) => cover && (cover.startsWith('photos/') || cover.startsWith('/') || /^https?:\/\//i.test(cover))

marked.setOptions({ gfm: true, breaks: true })

export function BlogList({ base = '/blog' }) {
  const { t, lang } = useI18n()
  const [posts, setPosts] = useState(null)
  useEffect(() => { api(`/blog?lang=${lang}`).then(d => setPosts(d.posts)).catch(() => setPosts([])) }, [lang])
  if (!posts) return <Spinner label={t('blog.loading')} />
  if (!posts.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-4xl">📝</p>
        <p className="text-ink font-semibold">{t('blog.none')}</p>
        <p className="text-ink-faint text-sm font-mono">{t('blog.dropHint')}</p>
      </div>
    )
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {posts.map((p, i) => (
        <Reveal key={p.slug} delay={i * 70}>
          <Link to={`${base}/${p.slug}`}>
            <Glass className="h-full rounded-2xl overflow-hidden transition-transform duration-300 hover:-translate-y-1 cursor-pointer">
              {coverIsImage(p.cover) && (
                <img src={media(p.cover)} alt="" className="w-full h-40 object-cover" />
              )}
              <div className="p-6">
                <p className="font-mono text-[11px] text-ink-faint mb-2">{p.date}</p>
                <h3 className="text-xl font-bold text-ink mb-2 leading-snug">{p.title}</h3>
                <p className="text-ink-soft text-sm leading-relaxed">{p.excerpt}…</p>
              </div>
            </Glass>
          </Link>
        </Reveal>
      ))}
    </div>
  )
}

export function BlogPostBody({ base = '/blog' }) {
  const { t, lang } = useI18n()
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => { api(`/blog/${slug}?lang=${lang}`).then(d => setPost(d.post)).catch(() => setErr(true)) }, [slug, lang])
  if (err) return <div className="text-center py-16 text-ink-soft">{t('blog.notFound')} <Link to={base} className="text-accent">{t('blog.back')}</Link></div>
  if (!post) return <Spinner label={t('blog.loadingPost')} />
  return (
    <article>
      <Link to={base} className="inline-flex items-center gap-2 text-ink-faint hover:text-ink text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('blog.all')}
      </Link>
      <p className="font-mono text-xs text-ink-faint mb-3">{post.date}</p>
      {coverIsImage(post.cover) && (
        <img src={media(post.cover)} alt="" className="w-full h-56 md:h-72 object-cover rounded-2xl border border-veil mb-6" />
      )}
      <div className="prose-hub" dangerouslySetInnerHTML={{ __html: marked.parse(post.body) }} />
    </article>
  )
}

function BlogFrame({ children }) {
  const { t } = useI18n()
  return (
    <ThemeFrame>
      <nav className="glass sticky top-0 z-50 rounded-none border-x-0 border-t-0">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-accent" />
            <span className="text-lg font-bold text-ink">AIHub</span>
            <span className="font-mono text-xs text-ink-faint ml-2">/ blog</span>
          </Link>
          <div className="flex items-center gap-3">
            <LangSwitcher />
            <Link to="/app" className="text-sm text-ink-soft hover:text-ink transition-colors">{t('nav.openApp')} →</Link>
          </div>
        </div>
      </nav>
      <main className="relative z-10 max-w-3xl mx-auto px-4 py-10 pb-24">{children}</main>
    </ThemeFrame>
  )
}

export function BlogPage() {
  const { t } = useI18n()
  return (
    <BlogFrame>
      <h1 className="text-liquid text-4xl md:text-5xl font-bold tracking-tight mb-8">{t('blog.title')}</h1>
      <BlogList />
    </BlogFrame>
  )
}

export function BlogPostPage() {
  return <BlogFrame><BlogPostBody /></BlogFrame>
}
