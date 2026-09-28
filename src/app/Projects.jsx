import { ProjectBoard } from '../site/Top10.jsx'
import { useI18n } from '../i18n.jsx'

export default function Projects() {
  const { t } = useI18n()
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-liquid text-3xl font-bold tracking-tight">{t('top.directory')}</h1>
        <p className="text-ink-soft">{t('top.directorySub')}</p>
      </div>
      <ProjectBoard mode="all" />
    </div>
  )
}
