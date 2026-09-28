import { useState, useEffect } from 'react'
import { X, Edit, Trash2, Plus, ChevronDown } from 'lucide-react'
import { Glass, GradBtn, Field, Spinner } from '../ui.jsx'
import { api } from '../api.js'

export default function EventsAdmin({ onClose }) {
  const [events, setEvents] = useState(null)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const res = await api('/events?when=all')
      setEvents(res.events)
    } catch (err) {
      console.error('Failed to load events:', err)
      setEvents([])
    }
  }

  const handleClose = () => {
    setShowForm(false)
    setEditing(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <Glass className="rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-ink">📅 Manage Events</h2>
          <button onClick={handleClose} className="text-ink-faint hover:text-ink cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {showForm ? (
          <EventForm
            event={editing}
            onSave={() => {
              setShowForm(false)
              setEditing(null)
              loadEvents()
            }}
            onCancel={() => {
              setShowForm(false)
              setEditing(null)
            }}
          />
        ) : !events ? (
          <Spinner label="loading events" />
        ) : (
          <div className="space-y-4">
            <GradBtn onClick={() => { setEditing(null); setShowForm(true) }} className="w-full flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> New Event
            </GradBtn>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-center text-ink-soft py-8">No events yet</p>
              ) : (
                events.map(e => (
                  <EventRow key={e.id} event={e} onEdit={() => { setEditing(e); setShowForm(true) }} onDelete={loadEvents} />
                ))
              )}
            </div>
          </div>
        )}
      </Glass>
    </div>
  )
}

function EventRow({ event, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete "${event.title}"?`)) return
    setDeleting(true)
    try {
      await api(`/admin/events/${event.id}`, { method: 'DELETE' })
      onDelete()
    } catch (err) {
      alert('Failed to delete event: ' + err.message)
      setDeleting(false)
    }
  }

  const startDate = new Date(event.starts_at).toLocaleDateString()

  return (
    <div className="flex items-center gap-3 p-3 bg-chip border border-veil rounded-lg hover:bg-veil transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink truncate">{event.title}</p>
        <p className="text-xs text-ink-faint">📅 {startDate}</p>
      </div>
      <button onClick={onEdit} className="p-2 text-ink-soft hover:text-accent transition-colors cursor-pointer" title="Edit">
        <Edit className="w-4 h-4" />
      </button>
      <button onClick={handleDelete} disabled={deleting} className="p-2 text-ink-soft hover:text-accent transition-colors cursor-pointer disabled:opacity-50" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

function EventForm({ event, onSave, onCancel }) {
  const [formData, setFormData] = useState(event ? {
    title: event.title,
    description: event.descriptions?.en || event.description || '',
    description_ru: event.descriptions?.ru || '',
    cover_image: event.cover_image,
    venue: event.venue,
    location: event.location,
    starts_at: event.starts_at.slice(0, 16),
    ends_at: event.ends_at ? event.ends_at.slice(0, 16) : '',
    status: event.status,
    ticket_types: event.ticket_types || [],
  } : {
    title: '',
    description: '',
    description_ru: '',
    cover_image: '',
    venue: '',
    location: '',
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: '',
    status: 'published',
    ticket_types: [],
  })

  const [saving, setSaving] = useState(false)
  const [expandedTt, setExpandedTt] = useState(null)

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const addTicketType = () => {
    setFormData(prev => ({
      ...prev,
      ticket_types: [...prev.ticket_types, { name: '', description: '', price_usdt: '0', price_kgs: '0', supply: null }]
    }))
  }

  const updateTicketType = (idx, key, value) => {
    setFormData(prev => ({
      ...prev,
      ticket_types: prev.ticket_types.map((t, i) => i === idx ? { ...t, [key]: value } : t)
    }))
  }

  const removeTicketType = (idx) => {
    setFormData(prev => ({
      ...prev,
      ticket_types: prev.ticket_types.filter((_, i) => i !== idx)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) return alert('Event title is required')
    if (!formData.starts_at) return alert('Start date is required')

    setSaving(true)
    try {
      const payload = {
        ...formData,
        descriptions: { en: formData.description, ru: formData.description_ru || '' },
        starts_at: new Date(formData.starts_at).toISOString(),
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : '',
      }

      if (event) {
        await api(`/admin/events/${event.id}`, { method: 'PUT', body: payload })
      } else {
        await api('/admin/events', { method: 'POST', body: payload })
      }
      onSave()
    } catch (err) {
      alert('Failed to save event: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3">
        <div>
          <label className="block text-xs uppercase tracking-widest text-ink-faint mb-2">Event Title *</label>
          <Field
            required
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g., Opening Meetup"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ink-faint mb-2">Description (English)</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="What's this event about?"
            rows={6}
            className="w-full px-3 py-2 bg-chip border border-veil rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-ink text-sm resize-y"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ink-faint mb-2">Description (Russian, optional)</label>
          <textarea
            value={formData.description_ru}
            onChange={(e) => handleChange('description_ru', e.target.value)}
            placeholder="Описание на русском — необязательно"
            rows={6}
            className="w-full px-3 py-2 bg-chip border border-veil rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-ink text-sm resize-y"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ink-faint mb-2">Cover Image URL</label>
          <Field
            value={formData.cover_image}
            onChange={(e) => handleChange('cover_image', e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ink-faint mb-2">Venue</label>
          <Field
            value={formData.venue}
            onChange={(e) => handleChange('venue', e.target.value)}
            placeholder="e.g., AIHub Countryside"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ink-faint mb-2">Location / Map URL</label>
          <Field
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="https://maps.google.com/... or address"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ink-faint mb-2">Start Date & Time *</label>
          <Field
            required
            type="datetime-local"
            value={formData.starts_at}
            onChange={(e) => handleChange('starts_at', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ink-faint mb-2">End Date & Time</label>
          <Field
            type="datetime-local"
            value={formData.ends_at}
            onChange={(e) => handleChange('ends_at', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ink-faint mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 bg-chip border border-veil rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-ink text-sm"
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-ink text-sm mb-3">🎫 Ticket Types</h3>
        <div className="space-y-2 mb-3">
          {formData.ticket_types.map((tt, idx) => (
            <TicketTypeField
              key={idx}
              ticketType={tt}
              expanded={expandedTt === idx}
              onToggle={() => setExpandedTt(expandedTt === idx ? null : idx)}
              onChange={(key, value) => updateTicketType(idx, key, value)}
              onRemove={() => removeTicketType(idx)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addTicketType}
          className="text-sm text-accent hover:text-accent-2 font-semibold cursor-pointer"
        >
          + Add Ticket Type
        </button>
      </div>

      <div className="flex gap-2 pt-4">
        <GradBtn type="submit" disabled={saving} className="flex-1">
          {saving ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
        </GradBtn>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg border border-veil text-ink-soft hover:text-ink text-sm cursor-pointer transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function TicketTypeField({ ticketType, expanded, onToggle, onChange, onRemove }) {
  return (
    <div className="border border-veil rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-chip transition-colors cursor-pointer text-left"
      >
        <div>
          <p className="font-semibold text-ink text-sm">{ticketType.name || 'Untitled'}</p>
          <p className="text-xs text-ink-faint">{ticketType.price_usdt} USDT · {ticketType.price_kgs} KGS</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-ink-faint transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="p-3 bg-chip border-t border-veil space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-widest text-ink-faint mb-1">Name</label>
            <Field
              value={ticketType.name}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder="e.g., General"
              className="text-sm py-2"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-ink-faint mb-1">Description</label>
            <textarea
              value={ticketType.description || ''}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="What's included?"
              rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-veil rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-ink text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs uppercase tracking-widest text-ink-faint mb-1">USDT</label>
              <Field
                type="number"
                step="0.01"
                value={ticketType.price_usdt}
                onChange={(e) => onChange('price_usdt', e.target.value)}
                placeholder="0"
                className="text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-ink-faint mb-1">KGS</label>
              <Field
                type="number"
                value={ticketType.price_kgs}
                onChange={(e) => onChange('price_kgs', e.target.value)}
                placeholder="0"
                className="text-sm py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-ink-faint mb-1">Supply (leave empty for unlimited)</label>
            <Field
              type="number"
              value={ticketType.supply || ''}
              onChange={(e) => onChange('supply', e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g., 100"
              className="text-sm py-2"
            />
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="w-full px-3 py-2 text-sm text-accent hover:text-accent-2 border border-accent/30 rounded-lg cursor-pointer transition-colors"
          >
            Remove Ticket Type
          </button>
        </div>
      )}
    </div>
  )
}
