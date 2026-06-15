import { useState } from 'react'
import Ticket from './Ticket'
import AddTicketForm from './AddTicketForm'

function Column({ column, columns, swimlaneTag, tickets, allTags, ticketProgress, onRefresh, onDeleteTicket, onRenameTicket, onUpdateDate, onAddTag, onRemoveTag, onMoveTicket, onOpenTicket, onOpenBoard }) {
  const [adding, setAdding] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragOver(false)
  }

  async function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const ticketId = parseInt(e.dataTransfer.getData('ticketId'))
    const sourceColumnId = parseInt(e.dataTransfer.getData('sourceColumnId'))
    const sourceSwimlaneTagId = e.dataTransfer.getData('sourceSwimlaneTagId')
    const destSwimlaneTagId = swimlaneTag?.id || ''

    // Handle swimlane tag changes
    if (sourceSwimlaneTagId !== destSwimlaneTagId) {
      // Remove source swimlane tag if it exists
      if (sourceSwimlaneTagId) {
        await onRemoveTag(ticketId, parseInt(sourceSwimlaneTagId))
      }
      // Add destination swimlane tag if it exists
      if (destSwimlaneTagId) {
        await onAddTag(ticketId, parseInt(destSwimlaneTagId))
      }
    }

    // Handle column change
    if (sourceColumnId !== column.id) {
      onMoveTicket(ticketId, column.id)
    }
  }

  return (
    <div
      className={`column ${dragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {tickets.map(ticket => (
        <Ticket
          key={ticket.id}
          ticket={ticket}
          swimlaneTag={swimlaneTag}
          columns={columns}
          allTags={allTags}
          progress={ticketProgress[ticket.id]}
          onDelete={onDeleteTicket}
          onRename={onRenameTicket}
          onUpdateDate={onUpdateDate}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onMove={onMoveTicket}
          onOpen={onOpenTicket}
          onOpenBoard={onOpenBoard}
        />
      ))}
      {adding
        ? <AddTicketForm
            column={column}
            allTags={allTags}
            swimlaneTag={swimlaneTag}
            onRefresh={onRefresh}
            onCancel={() => setAdding(false)}
          />
        : <button onClick={() => setAdding(true)} className="add-ticket-btn">
            + Add ticket
          </button>
      }
    </div>
  )
}

export default Column
