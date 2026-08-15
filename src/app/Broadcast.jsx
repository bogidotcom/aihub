import { useState } from 'react'
import { Send, X } from 'lucide-react'
import { Glass, GradBtn, Field } from '../ui.jsx'
import { api } from '../api.js'
import { useI18n } from '../i18n.jsx'

export default function Broadcast({ user, onClose }) {
  const { t } = useI18n()
  const [message, setMessage] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState('photo')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const send = async (e) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    try {
      const res = await api('/broadcast', {
        method: 'POST',
        body: {
          text: message,
          media_url: mediaUrl || null,
          media_type: mediaType,
        }
      })
      setResult(res)
      setMessage('')
      setMediaUrl('')
    } catch (err) {
      setResult({ error: err.message || 'Failed to send' })
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Glass className="rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">📢 Broadcast Message</h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-3 text-center py-6">
            <p className="text-4xl">{result.error ? '❌' : '✅'}</p>
            {result.error ? (
              <p className="text-accent text-sm">{result.error}</p>
            ) : (
              <>
                <p className="font-bold text-ink">Message sent!</p>
                <p className="text-sm text-ink-soft">
                  ✅ Sent: {result.sent}/{result.total}
                  {result.failed > 0 && ` | ❌ Failed: ${result.failed}`}
                </p>
              </>
            )}
            <GradBtn onClick={() => { setResult(null); onClose() }} className="w-full">
              Done
            </GradBtn>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-ink-faint mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message (supports HTML formatting: <b>bold</b>, <i>italic</i>)"
                rows={5}
                className="w-full px-3 py-2 bg-chip border border-veil rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-ink text-sm resize-none"
              />
              <p className="text-[10px] text-ink-faint mt-1">Supports HTML: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;u&gt;underline&lt;/u&gt;, &lt;code&gt;code&lt;/code&gt;</p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-ink-faint mb-2">Media (optional)</label>
              <div className="flex gap-2 mb-2">
                {['photo', 'video', 'none'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMediaType(type)}
                    className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors cursor-pointer ${
                      mediaType === type ? 'border-accent text-accent' : 'border-veil text-ink-faint'
                    }`}
                  >
                    {type === 'none' ? 'No media' : type}
                  </button>
                ))}
              </div>
              {mediaType !== 'none' && (
                <Field
                  type="text"
                  placeholder={`${mediaType} URL (https://...)`}
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
              )}
            </div>

            <div className="flex gap-2">
              <GradBtn type="submit" disabled={sending || !message.trim()} className="flex-1 !py-2.5">
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send to All'}
              </GradBtn>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-veil text-ink-soft hover:text-ink text-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Glass>
    </div>
  )
}
