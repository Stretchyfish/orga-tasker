import { useState } from 'react'

function Ticket({ ticket, columns, allTags, onOpen, onMove, onDelete, onRename, onAddTag, onRemoveTag }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

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

  const untaggedTags = allTags.filter(t => !ticket.tags.includes(t.name))

  return (
    <div className="ticket">
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

      <select
        className="ticket-column-select"
        value={ticket.columnId}
        onChange={e => onMove(ticket.id, Number(e.target.value))}
      >
        {columns.map(col => (
          <option key={col.id} value={col.id}>{col.name}</option>
        ))}
      </select>

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
