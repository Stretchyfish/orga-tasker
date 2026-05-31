import { useState } from 'react'

function AddTicketForm({ column, departments, defaultDeptId, onRefresh, onCancel }) {
  console.log('AddTicketForm mounted — defaultDeptId:', defaultDeptId, '| departments:', departments.map(d => `${d.id}:${d.name}`))
  const [title, setTitle] = useState('')
  const [deptId, setDeptId] = useState(defaultDeptId ?? '')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    console.log('Submitting — deptId state:', deptId)

    try {
      const res = await fetch('http://localhost:3000/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_id: column.id, title: title.trim() }),
      })
      const ticket = await res.json()
      console.log('Ticket created — id:', ticket.id)

      if (deptId) {
        const tagRes = await fetch(`http://localhost:3000/tickets/${ticket.id}/departments/${deptId}`, {
          method: 'POST',
        })
        console.log('Tag response — status:', tagRes.status)
      } else {
        console.log('No deptId — skipping tag')
      }
    } catch (err) {
      console.error('Submit error:', err)
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
