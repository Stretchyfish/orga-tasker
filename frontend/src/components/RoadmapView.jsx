import { useState } from 'react'

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function RoadmapView({ swimlaneTags, tickets, allTags, showUntagged, onUpdateStartDate, onUpdateDate, onRenameTicket }) {
  const [editingBar, setEditingBar] = useState(null)
  const [startDateEdit, setStartDateEdit] = useState('')
  const [dueDateEdit, setDueDateEdit] = useState('')

  // Get all tickets with at least one date
  const datedTickets = tickets.filter(t => t.start_date || t.due_date)

  // Compute date range
  let minDate = null
  let maxDate = null

  datedTickets.forEach(t => {
    if (t.start_date) {
      const d = new Date(t.start_date)
      if (!minDate || d < minDate) minDate = d
    }
    if (t.due_date) {
      const d = new Date(t.due_date)
      if (!maxDate || d > maxDate) maxDate = d
    }
  })

  if (!minDate && !maxDate) {
    minDate = new Date()
    maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
  } else if (!minDate) {
    minDate = new Date(maxDate)
    minDate.setDate(minDate.getDate() - 30)
  } else if (!maxDate) {
    maxDate = new Date(minDate)
    maxDate.setDate(maxDate.getDate() + 30)
  }

  // Add padding
  minDate.setDate(minDate.getDate() - 7)
  maxDate.setDate(maxDate.getDate() + 7)

  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24))
  const timelineWidth = Math.max(1200, totalDays * 2) // at least 2px per day

  // Generate timeline headers (weekly)
  const weeks = []
  let currentWeek = new Date(minDate)
  currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay())

  while (currentWeek < maxDate) {
    const weekStart = new Date(currentWeek)
    const weekEnd = new Date(currentWeek)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const daysFromStart = Math.ceil((weekStart - minDate) / (1000 * 60 * 60 * 24))
    const widthDays = Math.min(7, (maxDate - weekStart) / (1000 * 60 * 60 * 24))
    const width = (widthDays / totalDays) * 100

    weeks.push({
      start: weekStart,
      end: weekEnd,
      label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
      leftPercent: (daysFromStart / totalDays) * 100,
      widthPercent: width,
    })

    currentWeek.setDate(currentWeek.getDate() + 7)
  }

  function getBarPosition(startDate, dueDate) {
    const start = startDate ? new Date(startDate) : new Date(dueDate)
    const end = dueDate ? new Date(dueDate) : new Date(startDate)

    const daysFromStart = Math.ceil((start - minDate) / (1000 * 60 * 60 * 24))
    const barDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

    return {
      leftPercent: Math.max(0, (daysFromStart / totalDays) * 100),
      widthPercent: Math.max(1, (barDays / totalDays) * 100),
    }
  }

  async function saveBarEdit() {
    if (editingBar) {
      await onUpdateStartDate(editingBar.id, startDateEdit || null)
      await onUpdateDate(editingBar.id, dueDateEdit || null)
      setEditingBar(null)
    }
  }

  // Organize tickets by swimlane
  const swimlaneTickets = swimlaneTags.map(tag => ({
    tag,
    tickets: datedTickets.filter(t => t.tags.includes(tag.name)),
  }))

  if (showUntagged) {
    const untagged = datedTickets.filter(t => t.tags.length === 0)
    swimlaneTickets.push({
      tag: null,
      tickets: untagged,
    })
  }

  const undatedTickets = tickets.filter(t => !t.start_date && !t.due_date)

  return (
    <div className="roadmap-view">
      <div className="roadmap-swimlane-column">
        <div className="roadmap-header-spacer" />
        {swimlaneTickets.map((s) => (
          <div key={s.tag?.id || '__untagged__'} className="roadmap-swimlane-label">
            {s.tag ? s.tag.name : 'Untagged'}
          </div>
        ))}
        {undatedTickets.length > 0 && (
          <div className="roadmap-swimlane-label">No dates</div>
        )}
      </div>

      <div className="roadmap-timeline-container">
        <div className="roadmap-timeline-header">
          <div className="roadmap-timeline-track" style={{ width: `${timelineWidth}px` }}>
            {weeks.map((week, idx) => (
              <div
                key={idx}
                className="roadmap-week"
                style={{
                  left: `${week.leftPercent}%`,
                  width: `${week.widthPercent}%`,
                }}
              >
                <span className="roadmap-week-label">{week.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="roadmap-timeline-rows">
          {swimlaneTickets.map((s) => (
            <div key={s.tag?.id || '__untagged__'} className="roadmap-swimlane-row">
              <div className="roadmap-timeline-track" style={{ width: `${timelineWidth}px` }}>
                {s.tickets.map(ticket => {
                  if (!ticket.start_date && !ticket.due_date) return null
                  const pos = getBarPosition(ticket.start_date, ticket.due_date)
                  const columnColor = ticket.columnName === 'Done' ? '#4ade80' :
                                     ticket.columnName === 'In Progress' ? '#3b82f6' :
                                     ticket.columnName === 'To Do' ? '#f59e0b' : '#9ca3af'

                  return (
                    <div
                      key={ticket.id}
                      className="roadmap-bar"
                      style={{
                        left: `${pos.leftPercent}%`,
                        width: `${pos.widthPercent}%`,
                        backgroundColor: columnColor,
                      }}
                      onClick={() => {
                        setEditingBar(ticket)
                        setStartDateEdit(ticket.start_date || '')
                        setDueDateEdit(ticket.due_date || '')
                      }}
                      title={ticket.title}
                    >
                      <span className="roadmap-bar-label">{ticket.title}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {undatedTickets.length > 0 && (
            <div className="roadmap-swimlane-row">
              <div className="roadmap-no-dates">
                {undatedTickets.map(ticket => (
                  <div key={ticket.id} className="roadmap-undated-ticket">
                    {ticket.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {editingBar && (
        <div className="roadmap-edit-modal">
          <div className="roadmap-edit-popover">
            <h3>{editingBar.title}</h3>
            <div className="roadmap-edit-fields">
              <label>
                Start date:
                <input
                  type="date"
                  value={startDateEdit}
                  onChange={e => setStartDateEdit(e.target.value)}
                />
              </label>
              <label>
                Due date:
                <input
                  type="date"
                  value={dueDateEdit}
                  onChange={e => setDueDateEdit(e.target.value)}
                />
              </label>
            </div>
            <div className="roadmap-edit-actions">
              <button onClick={saveBarEdit}>Save</button>
              <button onClick={() => setEditingBar(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoadmapView
