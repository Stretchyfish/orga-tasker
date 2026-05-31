import { useState } from 'react'

function Ticket({ ticket, columns, departments, onOpen, onMove, onDelete, onRename, onAddTag, onRemoveTag }) {
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

  const untaggedDepts = departments.filter(d => !ticket.departments.includes(d.name))

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
          <span className="ticket-title" onClick={startEditing} title="Click to rename">
            {ticket.title}
          </span>
        )}
        <div className="ticket-actions">
          <button className="ticket-open-btn" onClick={() => onOpen(ticket.id, ticket.title)} title="Open sub-board">→</button>
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

      <div className="ticket-departments">
        {ticket.departments.map(deptName => {
          const dept = departments.find(d => d.name === deptName)
          return (
            <span key={deptName} className="ticket-tag">
              {deptName}
              {dept && (
                <button className="tag-remove-btn" onClick={() => onRemoveTag(ticket.id, dept.id)}>✕</button>
              )}
            </span>
          )
        })}
        {untaggedDepts.length > 0 && (
          <select
            className="tag-add-select"
            value=""
            onChange={e => {
              if (e.target.value) onAddTag(ticket.id, Number(e.target.value))
            }}
          >
            <option value="">+ tag</option>
            {untaggedDepts.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

export default Ticket
