import { useState, useEffect } from 'react'

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function TicketPanel({ ticket, allTags, ticketProgress, onUpdateDate, onUpdateStartDate, onUpdateDescription, onRenameTicket, onAddTag, onRemoveTag, onOpenBoard, onClose }) {
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState(ticket.description || '')
  const [editingStartDate, setEditingStartDate] = useState(false)
  const [startDateDraft, setStartDateDraft] = useState(ticket.start_date || '')
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [dueDateDraft, setDueDateDraft] = useState(ticket.due_date || '')

  useEffect(() => {
    async function loadBoard() {
      try {
        const res = await fetch(`http://localhost:3000/tickets/${ticket.id}/board`)
        const data = await res.json()
        setBoard(data)
      } catch (err) {
        console.error('Failed to load board:', err)
      } finally {
        setLoading(false)
      }
    }
    loadBoard()
  }, [ticket.id])

  async function saveDesc() {
    const desc = descDraft.trim()
    if (desc !== (ticket.description || '')) {
      await onUpdateDescription(ticket.id, desc)
    }
    setEditingDesc(false)
  }

  async function saveStartDate() {
    if (startDateDraft !== (ticket.start_date || '')) {
      await onUpdateStartDate(ticket.id, startDateDraft || null)
    }
    setEditingStartDate(false)
  }

  async function saveDueDate() {
    if (dueDateDraft !== (ticket.due_date || '')) {
      await onUpdateDate(ticket.id, dueDateDraft || null)
    }
    setEditingDueDate(false)
  }

  return (
    <div className="ticket-panel">
      <div className="ticket-panel-header">
        <h2 className="ticket-panel-title">{ticket.title}</h2>
        <button className="ticket-panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="ticket-panel-content">
        {/* Description */}
        <div className="ticket-panel-section">
          <h3>Description</h3>
          {editingDesc ? (
            <div className="ticket-panel-desc-edit">
              <textarea
                value={descDraft}
                onChange={e => setDescDraft(e.target.value)}
                onBlur={saveDesc}
                autoFocus
              />
            </div>
          ) : (
            <div className="ticket-panel-desc-view" onClick={() => setEditingDesc(true)}>
              {ticket.description || 'Click to add description'}
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="ticket-panel-section">
          <h3>Dates</h3>
          <div className="ticket-panel-date-row">
            <div className="ticket-panel-date-field">
              <label>Start</label>
              {editingStartDate ? (
                <input
                  type="date"
                  value={startDateDraft}
                  onChange={e => setStartDateDraft(e.target.value)}
                  onBlur={saveStartDate}
                  autoFocus
                />
              ) : (
                <div className="ticket-panel-date-value" onClick={() => setEditingStartDate(true)}>
                  {ticket.start_date ? formatDate(ticket.start_date) : 'Not set'}
                </div>
              )}
            </div>
            <div className="ticket-panel-date-field">
              <label>Due</label>
              {editingDueDate ? (
                <input
                  type="date"
                  value={dueDateDraft}
                  onChange={e => setDueDateDraft(e.target.value)}
                  onBlur={saveDueDate}
                  autoFocus
                />
              ) : (
                <div className="ticket-panel-date-value" onClick={() => setEditingDueDate(true)}>
                  {ticket.due_date ? formatDate(ticket.due_date) : 'Not set'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="ticket-panel-section">
            <h3>Tags</h3>
            <div className="ticket-panel-tags">
              {ticket.tags.map(tagName => {
                const tag = allTags.find(t => t.name === tagName)
                return (
                  <span key={tagName} className="ticket-panel-tag">
                    {tagName}
                    {tag && (
                      <button
                        className="ticket-panel-tag-remove"
                        onClick={() => onRemoveTag(ticket.id, tag.id)}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                )
              })}
              {ticket.tags.length < allTags.length && (
                <select
                  className="ticket-panel-tag-add"
                  onChange={e => {
                    if (e.target.value) {
                      onAddTag(ticket.id, Number(e.target.value))
                      e.target.value = ''
                    }
                  }}
                >
                  <option value="">+ Add tag</option>
                  {allTags
                    .filter(t => !ticket.tags.includes(t.name))
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Board */}
        <div className="ticket-panel-section ticket-panel-board-section">
          <h3>Sub-board</h3>
          {loading ? (
            <div className="ticket-panel-loading">Loading...</div>
          ) : board ? (
            <div className="ticket-panel-board">
              {board.columns.map(column => (
                <div key={column.id} className="ticket-panel-column">
                  <div className="ticket-panel-column-header">{column.name}</div>
                  <div className="ticket-panel-column-tickets">
                    {column.tickets.map(t => (
                      <div key={t.id} className="ticket-panel-ticket">
                        <div className="ticket-panel-ticket-title">{t.title}</div>
                        {t.tags.length > 0 && (
                          <div className="ticket-panel-ticket-tags">
                            {t.tags.map(tag => (
                              <span key={tag.id} className="ticket-panel-ticket-tag">{tag.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ticket-panel-error">Failed to load board</div>
          )}
        </div>

        {/* Open Button */}
        <button className="ticket-panel-open-btn" onClick={() => {
          onOpenBoard(ticket.id, ticket.title)
          onClose()
        }}>
          Open ticket
        </button>
      </div>
    </div>
  )
}

export default TicketPanel
