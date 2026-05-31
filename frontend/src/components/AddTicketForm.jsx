import { useState } from 'react'
import TagMultiSelect from './TagMultiSelect'

function AddTicketForm({ column, allTags, swimlaneTag, onRefresh, onCancel }) {
  const [title, setTitle] = useState('')
  const [selectedTags, setSelectedTags] = useState(swimlaneTag ? [swimlaneTag.id] : [])
  const [startDate, setStartDate] = useState('')
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
        start_date: startDate || null,
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
      <div className="add-ticket-dates">
        <div className="add-ticket-date-field">
          <label className="add-ticket-date-label">Start date</label>
          <input
            type="date"
            className="add-ticket-date-input"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <div className="add-ticket-date-field">
          <label className="add-ticket-date-label">End date</label>
          <input
            type="date"
            className="add-ticket-date-input"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>
      </div>
      {allTags.length > 0 && (
        <div className="add-ticket-tags-section">
          <label className="add-ticket-tags-label">Tags</label>
          <TagMultiSelect
            tags={allTags}
            selectedTags={selectedTags}
            onChange={setSelectedTags}
          />
        </div>
      )}
      <div className="add-ticket-form-actions">
        <button type="submit">Add</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export default AddTicketForm
