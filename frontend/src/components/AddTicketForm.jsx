import { useState } from 'react'
import DeptMultiSelect from './DeptMultiSelect'

function AddTicketForm({ column, departments, onRefresh, onCancel }) {
  const [title, setTitle] = useState('')
  const [selectedDepts, setSelectedDepts] = useState([])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return

    const res = await fetch('http://localhost:3000/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_id: column.id, title: title.trim() }),
    })
    const ticket = await res.json()

    await Promise.all(
      selectedDepts.map(deptId =>
        fetch(`http://localhost:3000/tickets/${ticket.id}/departments/${deptId}`, {
          method: 'POST',
        })
      )
    )

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
      {departments.length > 0 && (
        <DeptMultiSelect
          departments={departments}
          selectedDepts={selectedDepts}
          onChange={setSelectedDepts}
        />
      )}
      <div className="add-ticket-form-actions">
        <button type="submit">Add</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export default AddTicketForm
