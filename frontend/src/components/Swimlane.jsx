import { useState } from 'react'
import Column from './Column'

function Swimlane({ tag, columns, tickets, allTags, ticketProgress, onRefresh, onDeleteTicket, onRenameTicket, onUpdateDate, onDeleteTag, onRenameTag, onAddTag, onRemoveTag, onMoveTicket, onRemoveSwimlane, onOpenTicket }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEditing() {
    setDraft(tag.name)
    setEditing(true)
  }

  async function saveName() {
    const name = draft.trim()
    if (name && name !== tag.name) {
      await onRenameTag(tag.id, name)
    }
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveName()
    if (e.key === 'Escape') setEditing(false)
  }

  function handleDelete() {
    if (window.confirm(`Delete tag "${tag.name}"? This will remove it from all tickets.`)) {
      onDeleteTag(tag.id)
    }
  }

  function handleRemoveSwimlane() {
    onRemoveSwimlane(tag.id)
  }

  return (
    <div className="swimlane">
      <div className="swimlane-label">
        {tag ? (
          <div className="swimlane-label-content">
            {editing ? (
              <input
                className="swimlane-label-input"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            ) : (
              <span className="swimlane-label-name" onClick={startEditing}>{tag.name}</span>
            )}
            <div className="swimlane-label-buttons">
              <button className="swimlane-remove-swimlane-btn" onClick={handleRemoveSwimlane} title="Remove swimlane">−</button>
              <button className="swimlane-delete-btn" onClick={handleDelete} title="Delete tag">✕</button>
            </div>
          </div>
        ) : (
          'Untagged'
        )}
      </div>
      <div className="swimlane-columns">
        {columns.map(col => (
          <Column
            key={col.id}
            column={col}
            columns={columns}
            swimlaneTag={tag}
            tickets={tickets.filter(t => t.columnName === col.name)}
            allTags={allTags}
            ticketProgress={ticketProgress}
            onRefresh={onRefresh}
            onDeleteTicket={onDeleteTicket}
            onRenameTicket={onRenameTicket}
            onUpdateDate={onUpdateDate}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            onMoveTicket={onMoveTicket}
            onOpenTicket={onOpenTicket}
          />
        ))}
      </div>
    </div>
  )
}

export default Swimlane
