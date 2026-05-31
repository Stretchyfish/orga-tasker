import { useState } from 'react'
import Ticket from './Ticket'
import AddTicketForm from './AddTicketForm'

function Column({ column, columns, tickets, departments, onRefresh, onDeleteTicket, onRenameTicket, onAddTag, onRemoveTag, onMoveTicket, onOpenTicket }) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="column">
      {tickets.map(ticket => (
        <Ticket
          key={ticket.id}
          ticket={ticket}
          columns={columns}
          departments={departments}
          onDelete={onDeleteTicket}
          onRename={onRenameTicket}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onMove={onMoveTicket}
          onOpen={onOpenTicket}
        />
      ))}
      {adding
        ? <AddTicketForm
            column={column}
            departments={departments}
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
