function Ticket({ ticket, onOpen }) {
  return (
    <div className="ticket">
      <div className="ticket-header">
        <span className="ticket-title">{ticket.title}</span>
        <button
          className="ticket-open-btn"
          onClick={() => onOpen(ticket.id, ticket.title)}
          title="Open sub-board"
        >
          →
        </button>
      </div>
      <div className="ticket-departments">
        {ticket.departments.map(dept => (
          <span key={dept} className="ticket-tag">{dept}</span>
        ))}
      </div>
    </div>
  )
}

export default Ticket
