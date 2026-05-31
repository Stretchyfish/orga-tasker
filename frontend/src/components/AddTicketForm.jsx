import { useState } from 'react'
import TagMultiSelect from './TagMultiSelect'

function AddTicketForm({ column, allTags, onRefresh, onCancel }) {
  const [title, setTitle] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [dueDate, setDueDate] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return

    const res = await fetch('http://localhost:3000/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        column_id: column.id,
        title: title.trim(),
        due_date: dueDate || null,
      }),
    })
    const ticket = await res.json()

    await Promise.all(
      selectedTags.map(tagId =>
        fetch(`http://localhost:3000/tickets/${ticket.id}/tags/${tagId}`, {
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
      <input
        type="date"
        className="add-ticket-date-input"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
      />
      {allTags.length > 0 && (
        <TagMultiSelect
          tags={allTags}
          selectedTags={selectedTags}
          onChange={setSelectedTags}
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
