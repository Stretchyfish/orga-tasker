import { useState } from 'react'
import Ticket from './Ticket'
import AddTicketForm from './AddTicketForm'

function Column({ column, tickets, departments, defaultDeptId, onRefresh }) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="column">
      {tickets.map(ticket => (
        <Ticket key={ticket.id} ticket={ticket} />
      ))}
      {adding
        ? <AddTicketForm
            column={column}
            departments={departments}
            defaultDeptId={defaultDeptId}
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
