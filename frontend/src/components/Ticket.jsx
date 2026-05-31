import { useState } from 'react'

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function parseDate(dateString) {
  if (!dateString) return ''
  if (dateString.includes('-')) return dateString // Already in YYYY-MM-DD format
  // Convert dd/mm/yyyy to yyyy-mm-dd
  const parts = dateString.split('/')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return dateString
}

function formatDateInput(dateString) {
  if (!dateString) return ''
  if (dateString.includes('/')) return dateString // Already in dd/mm/yyyy format
  // Convert yyyy-mm-dd to dd/mm/yyyy
  const parts = dateString.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateString
}

function Ticket({ ticket, swimlaneTag, columns, allTags, progress, onOpen, onMove, onDelete, onRename, onUpdateDate, onAddTag, onRemoveTag }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingDate, setEditingDate] = useState(false)
  const [dateDraft, setDateDraft] = useState('')

  function startEditing() {
    setDraft(ticket.title)
    setEditing(true)
  }

  async function saveTitle() {
    const title = draft.trim()
    if (title && title !== ticket.title) {
      await onRename(ticket.id, title)
    }
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveTitle()
    if (e.key === 'Escape') setEditing(false)
  }

  function handleDelete() {
    if (window.confirm(`Delete "${ticket.title}"?`)) {
      onDelete(ticket.id)
    }
  }

  function startEditingDate() {
    setDateDraft(ticket.due_date || '')
    setEditingDate(true)
  }

  async function saveDate() {
    if (dateDraft !== (ticket.due_date || '')) {
      await onUpdateDate(ticket.id, dateDraft || null)
    }
    setEditingDate(false)
  }

  const untaggedTags = allTags.filter(t => !ticket.tags.includes(t.name))

  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('ticketId', ticket.id)
    e.dataTransfer.setData('sourceColumnId', ticket.columnId)
    e.dataTransfer.setData('sourceSwimlaneTagId', swimlaneTag?.id || '')
    e.currentTarget.style.opacity = '0.5'
  }

  function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1'
  }

  return (
    <div className="ticket" draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="ticket-header">
        {editing ? (
          <input
            className="ticket-title-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <span className="ticket-title" onClick={() => onOpen(ticket.id, ticket.title)} title="Click to open sub-board">
            {ticket.title}
          </span>
        )}
        <div className="ticket-actions">
          <button className="ticket-open-btn" onClick={startEditing} title="Rename ticket">✎</button>
          <button className="ticket-delete-btn" onClick={handleDelete} title="Delete ticket">✕</button>
        </div>
      </div>

      <div className="ticket-date">
        {editingDate ? (
          <input
            type="date"
            className="ticket-date-input"
            value={dateDraft}
            onChange={e => setDateDraft(e.target.value)}
            onBlur={saveDate}
            autoFocus
          />
        ) : (
          <span
            className={`ticket-date-display ${ticket.due_date ? 'has-date' : 'no-date'}`}
            onClick={startEditingDate}
            title="Click to set date"
          >
            {ticket.due_date ? formatDate(ticket.due_date) : 'No date'}
          </span>
        )}
      </div>

      {progress && (
        <div className="ticket-progress-container">
          <div className="ticket-progress-bar">
            <div
              className="ticket-progress-fill"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <div className="ticket-progress-text">{progress.done}/{progress.total}</div>
        </div>
      )}

      <div className="ticket-tags">
        {ticket.tags.map(tagName => {
          const tag = allTags.find(t => t.name === tagName)
          return (
            <span key={tagName} className="ticket-tag">
              {tagName}
              {tag && (
                <button className="tag-remove-btn" onClick={() => onRemoveTag(ticket.id, tag.id)}>✕</button>
              )}
            </span>
          )
        })}
        {untaggedTags.length > 0 && (
          <select
            className="tag-add-select"
            value=""
            onChange={e => {
              if (e.target.value) onAddTag(ticket.id, Number(e.target.value))
            }}
          >
            <option value="">+ tag</option>
            {untaggedTags.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

export default Ticket
