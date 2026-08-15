import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Gift } from 'lucide-react'
import { Glass, Reveal, GradBtn, Field } from '../ui.jsx'
import { api } from '../api.js'
import { useSession } from '../session.jsx'
import { useI18n } from '../i18n.jsx'

const TEACHER_SITE = 'https://bogdansizov.space'

export default function Learn() {
  const { t } = useI18n()
  const { config, user } = useSession()
  const [selected, setSelected] = useState(null)
  const programs = (config?.vibecoding_programs || []).map(p => ({ ...p, ...t(`learn.prog.${p.key}`) }))

  if (selected) return <ProgramDetail program={selected} onBack={() => setSelected(null)} user={user} />

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-liquid text-3xl font-bold tracking-tight">{t('learn.title')}</h1>
        <p className="text-ink-soft leading-relaxed">
          {t('learn.intro').split('{b}')[0]}
          <b className="text-ink">{t('learn.introB')}</b>
          {t('learn.intro').split('{b}')[1]}
        </p>
      </div>

      <div className="space-y-4">
        {programs.map((p, i) => (
          <Reveal key={p.key} delay={i * 90}>
            <Glass className="rounded-2xl p-6 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-ink">{p.title}</h3>
                  <p className="font-mono text-[11px] text-ink-faint">{p.format}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-accent font-bold">{p.kgs.toLocaleString()} KGS</p>
                  <p className="font-mono text-[11px] text-ink-faint">≈ {p.usdt} USDT</p>
                </div>
              </div>
              <p className="text-ink-soft text-sm">{p.duration} · {p.schedule}</p>
              <GradBtn onClick={() => setSelected(p)} className="w-full !py-2.5 text-sm group">
                {t('learn.enroll')} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </GradBtn>
            </Glass>
          </Reveal>
        ))}
      </div>

      <Link to="/app/gifts" className="flex items-center gap-2 text-sm text-accent"><Gift className="w-4 h-4" /> {t('learn.giftLink')}</Link>
    </div>
  )
}

function ProgramDetail({ program, onBack, user }) {
  const { t } = useI18n()
  const [contact, setContact] = useState('')
  const [state, setState] = useState('idle')

  const apply = async (e) => {
    e.preventDefault()
    setState('sending')
    try {
      await api('/contact', {
        method: 'POST',
        body: { name: user?.first_name || '', contact, topic: `vibecoding:${program.key}`, message: `Application for "${program.title}" (${program.kgs} KGS)` },
      })
      setState('sent')
    } catch { setState('error') }
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-ink-faint hover:text-ink text-sm transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> {t('learn.allPrograms')}
      </button>

      <Glass className="rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">{program.title}</h1>
            <p className="font-mono text-[11px] text-ink-faint">{program.format}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-accent font-bold text-lg">{program.kgs.toLocaleString()} KGS</p>
            <p className="font-mono text-[11px] text-ink-faint">≈ {program.usdt} USDT</p>
          </div>
        </div>
        <p className="text-ink-soft">{program.duration} · {program.schedule}</p>
        <ul className="space-y-2">
          {program.perks.map(perk => (
            <li key={perk} className="flex items-start gap-2.5 text-ink-soft text-sm">
              <Check className="w-4 h-4 text-accent-3 shrink-0 mt-0.5" /> {perk}
            </li>
          ))}
        </ul>
      </Glass>

      {/* waterfall roadmap */}
      <div className="space-y-3">
        <h2 className="font-mono text-xs tracking-[0.25em] uppercase text-ink-faint">{t('learn.roadmap')}</h2>
        <div className="space-y-2">
          {t('learn.steps').map((r, i) => (
            <Reveal key={r.title} delay={i * 80}>
              <Glass className="rounded-xl p-4 flex gap-4">
                <div style={{ width: `${i * 10}%` }} className="shrink-0 hidden sm:block" />
                <span className="font-mono text-accent font-bold shrink-0">0{i + 1}</span>
                <div>
                  <p className="font-bold text-ink text-sm">{r.title}</p>
                  <p className="text-ink-soft text-sm">{r.desc}</p>
                </div>
              </Glass>
            </Reveal>
          ))}
        </div>
      </div>

      {/* teacher */}
      <div className="space-y-3">
        <h2 className="font-mono text-xs tracking-[0.25em] uppercase text-ink-faint">{t('learn.teaching')}</h2>
        <Glass className="rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-xl font-bold text-ink">Bogdan Sizov</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-faint mt-1">{t('learn.teacher.role')}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {t('learn.teacher.stats').map(([v, l]) => (
              <div key={l} className="bg-chip border border-veil rounded-xl py-3">
                <p className="text-lg font-bold text-accent">{v}</p>
                <p className="text-[11px] text-ink-faint">{l}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {t('learn.teacher.timeline').map(([when, what]) => (
              <div key={when} className="flex gap-3 text-sm">
                <span className="font-mono text-[11px] text-ink-faint shrink-0 w-24 pt-0.5">{when}</span>
                <span className="text-ink-soft">{what}</span>
              </div>
            ))}
          </div>
          <a href={TEACHER_SITE} target="_blank" rel="noreferrer" className="font-mono text-xs text-accent">bogdansizov.space →</a>
        </Glass>
      </div>

      {/* apply */}
      <Glass className="rounded-2xl p-6 space-y-3">
        {state === 'sent' ? (
          <div className="text-center space-y-2 py-4">
            <p className="text-3xl">🚀</p>
            <p className="font-bold text-ink">{t('learn.applied')}</p>
            <p className="text-ink-soft text-sm">{t('learn.appliedSub')}</p>
          </div>
        ) : (
          <form onSubmit={apply} className="space-y-3">
            <p className="font-bold text-ink">{t('learn.applyFor', { title: program.title })}</p>
            <Field placeholder={t('learn.contactPh')} value={contact} onChange={e => setContact(e.target.value)} required />
            <GradBtn type="submit" disabled={state === 'sending'} className="w-full">
              {state === 'sending' ? t('learn.sending') : t('learn.apply')}
            </GradBtn>
            {state === 'error' && <p className="text-center text-sm text-accent">{t('learn.error')}</p>}
          </form>
        )}
      </Glass>
    </div>
  )
}
