import { Link } from 'react-router-dom'
import { media } from '../media.js'

export function Logo({ className = '', textClassName = 'text-xl', to = '#home' }) {
  const classNames = `flex items-center gap-2.5 ${className}`
  const mark = (
    <>
      <img src={media('therm-logo.svg')} alt="THERM" className="h-10 w-10 object-contain" />
      <span className={`font-bold text-ink ${textClassName}`}>THERM</span>
    </>
  )
  if (to.startsWith('#')) return <a href={to} className={classNames}>{mark}</a>
  const home = to === '/' ? import.meta.env.BASE_URL : null
  if (home) return <a href={home} className={classNames}>{mark}</a>
  return <Link to={to} className={classNames}>{mark}</Link>
}

// A soft, warm-tinted photo behind a section that fades out at both edges,
// so it reads as atmosphere rather than a banner.
export function Backdrop({ src, opacity = 0.22 }) {
  const mask = 'linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)'
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true"
      style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <img src={media(src)} alt="" className="w-full h-full object-cover tinted" style={{ opacity }} />
    </div>
  )
}

export function IdeaPhoto({ src, label, className = '' }) {
  return (
    <div className={`relative rounded-3xl overflow-hidden shadow-xl border border-veil ${className}`}>
      <img src={media(src)} alt="" className="w-full h-full object-cover tinted" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
      <p className="absolute bottom-4 left-5 right-5 text-white font-semibold text-sm font-display tracking-wide">{label}</p>
    </div>
  )
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
