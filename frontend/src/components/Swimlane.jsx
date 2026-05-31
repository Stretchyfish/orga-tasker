import { useState } from 'react'
import Column from './Column'

function Swimlane({ department, columns, tickets, departments, onRefresh, onDeleteTicket, onRenameTicket, onDeleteDept, onRenameDept, onAddTag, onRemoveTag, onMoveTicket, onOpenTicket }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEditing() {
    setDraft(department.name)
    setEditing(true)
  }

  async function saveName() {
    const name = draft.trim()
    if (name && name !== department.name) {
      await onRenameDept(department.id, name)
    }
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveName()
    if (e.key === 'Escape') setEditing(false)
  }

  function handleDelete() {
    if (window.confirm(`Delete department "${department.name}"? This will remove it from all tickets.`)) {
      onDeleteDept(department.id)
    }
  }

  return (
    <div className="swimlane">
      <div className="swimlane-label">
        {department ? (
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
              <span className="swimlane-label-name" onClick={startEditing}>{department.name}</span>
            )}
            <button className="swimlane-delete-btn" onClick={handleDelete}>✕</button>
          </div>
        ) : (
          'Unassigned'
        )}
      </div>
      <div className="swimlane-columns">
        {columns.map(col => (
          <Column
            key={col.id}
            column={col}
            columns={columns}
            tickets={tickets.filter(t => t.columnName === col.name)}
            departments={departments}
            onRefresh={onRefresh}
            onDeleteTicket={onDeleteTicket}
            onRenameTicket={onRenameTicket}
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
