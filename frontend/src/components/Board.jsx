import { useState, useEffect } from 'react'
import Swimlane from './Swimlane'
import AddTagForm from './AddTagForm'
import SwimlaneSelector from './SwimlaneSelector'

function Board({ parentTicket, allTags, swimlaneTags, columns, tickets, showUntagged, onRefresh, onDeleteTicket, onRenameTicket, onUpdateDescription, onUpdateDate, onDeleteTag, onRenameTag, onAddTag, onRemoveTag, onMoveTicket, onAddSwimlane, onRemoveSwimlane, onToggleUntagged, onOpenTicket }) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [editingDate, setEditingDate] = useState(false)
  const [dateDraft, setDateDraft] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [ticketProgress, setTicketProgress] = useState({})

  function startEditingTitle() {
    setTitleDraft(parentTicket.label)
    setEditingTitle(true)
  }

  async function saveTitle() {
    const title = titleDraft.trim()
    if (title && title !== parentTicket.label) {
      await onRenameTicket(parentTicket.ticketId, title)
    }
    setEditingTitle(false)
  }

  function handleTitleKeyDown(e) {
    if (e.key === 'Enter') saveTitle()
    if (e.key === 'Escape') setEditingTitle(false)
  }

  function startEditingDesc() {
    setDescDraft(parentTicket.description || '')
    setEditingDesc(true)
  }

  async function saveDesc() {
    const desc = descDraft.trim()
    if (desc !== (parentTicket.description || '')) {
      await onUpdateDescription(parentTicket.ticketId, desc)
    }
    setEditingDesc(false)
  }

  function handleDescKeyDown(e) {
    if (e.key === 'Escape') setEditingDesc(false)
  }

  function startEditingDate() {
    setDateDraft(parentTicket.due_date || '')
    setEditingDate(true)
  }

  async function saveDate() {
    const date = dateDraft
    if (date !== (parentTicket.due_date || '')) {
      await onUpdateDate(parentTicket.ticketId, date || null)
    }
    setEditingDate(false)
  }

  function handleDateKeyDown(e) {
    if (e.key === 'Escape') setEditingDate(false)
  }

  useEffect(() => {
    async function fetchProgress() {
      const progress = {}
      for (const ticket of tickets) {
        try {
          const res = await fetch(`http://localhost:3000/tickets/${ticket.id}/board`)
          const board = await res.json()
          const doneColumn = board.columns.find(col => col.name.toLowerCase() === 'done')
          if (doneColumn) {
            const doneTickets = doneColumn.tickets.length
            const totalTickets = board.columns.reduce((sum, col) => sum + col.tickets.length, 0)
            if (totalTickets > 0) {
              progress[ticket.id] = { done: doneTickets, total: totalTickets }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch progress for ticket ${ticket.id}:`, err)
        }
      }
      setTicketProgress(progress)
    }
    if (tickets.length > 0) {
      fetchProgress()
    }
  }, [tickets])

  const untagged = tickets.filter(t => t.tags.length === 0)
  const availableForSwimlane = allTags.filter(tag => !swimlaneTags.some(s => s.id === tag.id))

  return (
    <div className="board">
      {parentTicket && (
        <div className="parent-ticket-header">
          {editingTitle ? (
            <input
              className="parent-ticket-title-input"
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={handleTitleKeyDown}
              autoFocus
            />
          ) : (
            <div className="parent-ticket-title-container">
              <h2 className="parent-ticket-title" onClick={startEditingTitle} title="Click to edit">
                {parentTicket.label}
              </h2>
              <button className="parent-ticket-edit-btn" onClick={startEditingTitle} title="Edit title">✎</button>
            </div>
          )}
          <div className="parent-ticket-description-section">
            {editingDesc ? (
              <div className="parent-ticket-description-edit">
                <textarea
                  className="parent-ticket-description-input"
                  value={descDraft}
                  onChange={e => setDescDraft(e.target.value)}
                  onKeyDown={handleDescKeyDown}
                  placeholder="Add a description..."
                  autoFocus
                />
                <div className="parent-ticket-description-actions">
                  <button className="desc-save-btn" onClick={saveDesc}>Save</button>
                  <button className="desc-cancel-btn" onClick={() => setEditingDesc(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="parent-ticket-description-container" onClick={startEditingDesc}>
                {parentTicket.description ? (
                  <p className="parent-ticket-description">{parentTicket.description}</p>
                ) : (
                  <p className="parent-ticket-description-placeholder">Click to add a description</p>
                )}
              </div>
            )}
          </div>
          <div className="parent-ticket-date-section">
            {editingDate ? (
              <div className="parent-ticket-date-edit">
                <input
                  type="date"
                  className="parent-ticket-date-input"
                  value={dateDraft}
                  onChange={e => setDateDraft(e.target.value)}
                  onBlur={saveDate}
                  onKeyDown={handleDateKeyDown}
                  autoFocus
                />
                <div className="parent-ticket-date-actions">
                  <button className="date-save-btn" onClick={saveDate}>Save</button>
                  <button className="date-cancel-btn" onClick={() => setEditingDate(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="parent-ticket-date-container" onClick={startEditingDate}>
                {parentTicket.due_date ? (
                  <p className="parent-ticket-date">{new Date(parentTicket.due_date).toLocaleDateString()}</p>
                ) : (
                  <p className="parent-ticket-date-placeholder">Click to add a date</p>
                )}
              </div>
            )}
          </div>
          <div className="parent-ticket-tags-section">
            <div className="parent-ticket-tags">
              {(parentTicket.tags || []).map(tagName => {
                const tag = allTags.find(t => t.name === tagName)
                return (
                  <span key={tagName} className="parent-ticket-tag">
                    {tagName}
                    {tag && (
                      <button
                        className="parent-tag-remove-btn"
                        onClick={() => onRemoveTag(parentTicket.ticketId, tag.id)}
                        title="Remove tag"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                )
              })}
              {allTags.length > (parentTicket.tags || []).length && (
                <div className="parent-ticket-tag-dropdown">
                  <button
                    className="parent-ticket-tag-add-btn"
                    onClick={() => setShowTagDropdown(!showTagDropdown)}
                    title="Add tag"
                  >
                    + tag
                  </button>
                  {showTagDropdown && (
                    <div className="parent-ticket-tag-dropdown-menu">
                      {allTags
                        .filter(t => !(parentTicket.tags || []).includes(t.name))
                        .map(tag => (
                          <button
                            key={tag.id}
                            className="parent-ticket-tag-option"
                            onClick={() => {
                              onAddTag(parentTicket.ticketId, tag.id)
                              setShowTagDropdown(false)
                            }}
                          >
                            {tag.name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="board-controls">
        <AddTagForm onRefresh={onRefresh} />
        <SwimlaneSelector availableTags={availableForSwimlane} onAdd={onAddSwimlane} />
        <label className="show-untagged-toggle">
          <input
            type="checkbox"
            checked={showUntagged}
            onChange={onToggleUntagged}
          />
          Show untagged
        </label>
      </div>

      <div className="board-column-headers">
        <div className="swimlane-label-spacer" />
        {columns.map(col => (
          <div key={col.id} className="board-column-header">{col.name}</div>
        ))}
      </div>

      {swimlaneTags.map(tag => (
        <Swimlane
          key={tag.id}
          tag={tag}
          columns={columns}
          tickets={tickets.filter(t => t.tags.includes(tag.name))}
          allTags={allTags}
          ticketProgress={ticketProgress}
          onRefresh={onRefresh}
          onDeleteTicket={onDeleteTicket}
          onRenameTicket={onRenameTicket}
          onUpdateDate={onUpdateDate}
          onDeleteTag={onDeleteTag}
          onRenameTag={onRenameTag}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onMoveTicket={onMoveTicket}
          onRemoveSwimlane={onRemoveSwimlane}
          onOpenTicket={onOpenTicket}
        />
      ))}

      {showUntagged && (
        <Swimlane
          key="__untagged__"
          tag={null}
          columns={columns}
          tickets={untagged}
          allTags={allTags}
          ticketProgress={ticketProgress}
          onRefresh={onRefresh}
          onDeleteTicket={onDeleteTicket}
          onRenameTicket={onRenameTicket}
          onUpdateDate={onUpdateDate}
          onDeleteTag={onDeleteTag}
          onRenameTag={onRenameTag}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onMoveTicket={onMoveTicket}
          onOpenTicket={onOpenTicket}
        />
      )}
    </div>
  )
}

export default Board
