import { useState } from 'react'
import Swimlane from './Swimlane'
import AddTagForm from './AddTagForm'
import SwimlaneSelector from './SwimlaneSelector'

function Board({ parentTicket, allTags, swimlaneTags, columns, tickets, showUntagged, onRefresh, onDeleteTicket, onRenameTicket, onDeleteTag, onRenameTag, onAddTag, onRemoveTag, onMoveTicket, onAddSwimlane, onRemoveSwimlane, onToggleUntagged, onOpenTicket }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEditing() {
    setDraft(parentTicket.label)
    setEditing(true)
  }

  async function saveTitle() {
    const title = draft.trim()
    if (title && title !== parentTicket.label) {
      await onRenameTicket(parentTicket.ticketId, title)
    }
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveTitle()
    if (e.key === 'Escape') setEditing(false)
  }
  const untagged = tickets.filter(t => t.tags.length === 0)
  const availableForSwimlane = allTags.filter(tag => !swimlaneTags.some(s => s.id === tag.id))

  return (
    <div className="board">
      {parentTicket && (
        <div className="parent-ticket-header">
          {editing ? (
            <input
              className="parent-ticket-title-input"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <div className="parent-ticket-title-container">
              <h2 className="parent-ticket-title" onClick={startEditing} title="Click to edit">
                {parentTicket.label}
              </h2>
              <button className="parent-ticket-edit-btn" onClick={startEditing} title="Edit title">✎</button>
            </div>
          )}
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
          onRefresh={onRefresh}
          onDeleteTicket={onDeleteTicket}
          onRenameTicket={onRenameTicket}
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
          onRefresh={onRefresh}
          onDeleteTicket={onDeleteTicket}
          onRenameTicket={onRenameTicket}
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
