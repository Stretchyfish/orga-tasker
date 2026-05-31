import { useState } from 'react'

function AddTicketForm({ column, departments, defaultDeptId, onRefresh, onCancel }) {
  const [title, setTitle] = useState('')
  const [deptId, setDeptId] = useState(defaultDeptId ?? '')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return

    const res = await fetch('http://localhost:3000/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_id: column.id, title: title.trim() }),
    })
    const ticket = await res.json()

    if (deptId) {
      await fetch(`http://localhost:3000/tickets/${ticket.id}/departments/${deptId}`, {
        method: 'POST',
      })
    }

    onCancel()
    onRefresh()
  }

  return (
    <form onSubmit={handleSubmit} className="add-ticket-form">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Ticket title"
        autoFocus
      />
      <select value={deptId} onChange={e => setDeptId(e.target.value)}>
        <option value="">No department</option>
        {departments.map(d => (
          <option key={d.id} value={String(d.id)}>{d.name}</option>
        ))}
      </select>
      <button type="submit">Add</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  )
}

export default AddTicketForm
