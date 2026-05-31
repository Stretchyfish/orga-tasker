import { useState } from 'react'
import Column from './Column'

function Swimlane({ tag, swimlaneIndex, columns, tickets, allTags, ticketProgress, onRefresh, onDeleteTicket, onRenameTicket, onUpdateDate, onDeleteTag, onRenameTag, onAddTag, onRemoveTag, onMoveTicket, onRemoveSwimlane, onOpenTicket, draggedSwimlaneId, onDragSwimlane, onDropSwimlane }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [dragOverSwimlane, setDragOverSwimlane] = useState(false)

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

  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('swimlaneId', tag?.id || '')
    onDragSwimlane(swimlaneIndex)
  }

  function handleDragOver(e) {
    const isSwimlane = e.dataTransfer.types.includes('swimlaneId')
    if (!isSwimlane) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSwimlane(true)
  }

  function handleDragLeave(e) {
    setDragOverSwimlane(false)
  }

  function handleDrop(e) {
    const isSwimlane = e.dataTransfer.types.includes('swimlaneId')
    if (!isSwimlane) return
    e.preventDefault()
    setDragOverSwimlane(false)
    onDropSwimlane(draggedSwimlaneId, swimlaneIndex)
  }

  return (
    <div
      className={`swimlane ${dragOverSwimlane ? 'swimlane-drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className="swimlane-label"
        draggable={tag ? true : false}
        onDragStart={handleDragStart}
      >
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
