function Ticket({ ticket }) {
  return (
    <div className="ticket">
      <span className="ticket-title">{ticket.title}</span>
      <div className="ticket-departments">
        {ticket.departments.map(dept => (
          <span key={dept} className="ticket-tag">{dept}</span>
        ))}
      </div>
    </div>
  )
}

export default Ticket
