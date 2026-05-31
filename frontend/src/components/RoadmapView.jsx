import { useState, useEffect } from 'react'

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function RoadmapView({ swimlaneTags, tickets, allTags, showUntagged, ticketProgress, onUpdateStartDate, onUpdateDate, onRenameTicket, onToggleView, onOpenTicket }) {
  const [editingBar, setEditingBar] = useState(null)
  const [startDateEdit, setStartDateEdit] = useState('')
  const [dueDateEdit, setDueDateEdit] = useState('')
  const [draggingBar, setDraggingBar] = useState(null)
  const [dragType, setDragType] = useState(null) // 'start', 'end', or 'move'
  const [dragStartX, setDragStartX] = useState(0)
  const [dragOriginalDates, setDragOriginalDates] = useState(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get all tickets with a due date (tickets without any date show in "No dates" row)
  const datedTickets = tickets.filter(t => t.due_date)

  // Compute date range

  let minDate = new Date(today)
  let maxDate = new Date(today)

  datedTickets.forEach(t => {
    if (t.start_date) {
      const d = new Date(t.start_date)
      if (d < minDate) minDate = d
    }
    if (t.due_date) {
      const d = new Date(t.due_date)
      if (d > maxDate) maxDate = d
    }
  })

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
    const start = startDate ? new Date(startDate) : today
    const end = dueDate ? new Date(dueDate) : today

    const daysFromStart = Math.ceil((start - minDate) / (1000 * 60 * 60 * 24))
    const barDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

    return {
      leftPercent: Math.max(0, (daysFromStart / totalDays) * 100),
      widthPercent: Math.max(1, (barDays / totalDays) * 100),
    }
  }

  useEffect(() => {
    if (draggingBar) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggingBar, dragType, dragStartX, dragOriginalDates, timelineWidth])

  async function saveBarEdit() {
    if (editingBar) {
      await onUpdateStartDate(editingBar.id, startDateEdit || null)
      await onUpdateDate(editingBar.id, dueDateEdit || null)
      setEditingBar(null)
    }
  }

  function handleBarMouseDown(e, ticket, barElement) {
    if (e.button !== 0) return // Only left mouse button

    const rect = barElement.getBoundingClientRect()
    const barWidth = rect.width
    const relativeX = e.clientX - rect.left
    const percentX = relativeX / barWidth

    let type = 'move'
    if (percentX < 0.15) type = 'start'
    else if (percentX > 0.85) type = 'end'

    setDraggingBar(ticket)
    setDragType(type)
    setDragStartX(e.clientX)
    setDragOriginalDates({
      start: ticket.start_date,
      end: ticket.due_date,
    })
    e.preventDefault()
  }

  function handleMouseMove(e) {
    if (!draggingBar || !dragType || !dragOriginalDates) return

    const deltaX = e.clientX - dragStartX
    const daysDelta = Math.round(deltaX * totalDays / (timelineWidth || 1))

    const start = dragOriginalDates.start ? new Date(dragOriginalDates.start) : new Date(today)
    const end = dragOriginalDates.end ? new Date(dragOriginalDates.end) : new Date(today)

    let newStart = new Date(start)
    let newEnd = new Date(end)

    if (daysDelta !== 0) {
      if (dragType === 'start') {
        newStart.setDate(newStart.getDate() + daysDelta)
      } else if (dragType === 'end') {
        newEnd.setDate(newEnd.getDate() + daysDelta)
      } else {
        newStart.setDate(newStart.getDate() + daysDelta)
        newEnd.setDate(newEnd.getDate() + daysDelta)
      }
    }

    const formatDateForAPI = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Update the dragging bar in the UI optimistically
    const updatedTicket = { ...draggingBar }
    if (dragType === 'start' || dragType === 'move') {
      updatedTicket.start_date = formatDateForAPI(newStart)
    }
    if (dragType === 'end' || dragType === 'move') {
      updatedTicket.due_date = formatDateForAPI(newEnd)
    }
    setDraggingBar(updatedTicket)
  }

  function handleMouseUp() {
    if (!draggingBar || !dragType) return

    if (dragType === 'start' || dragType === 'move') {
      onUpdateStartDate(draggingBar.id, draggingBar.start_date || null)
    }
    if (dragType === 'end' || dragType === 'move') {
      onUpdateDate(draggingBar.id, draggingBar.due_date || null)
    }

    setDraggingBar(null)
    setDragType(null)
    setDragOriginalDates(null)
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

  const undatedTickets = tickets.filter(t => !t.due_date)

  return (
    <div className="roadmap-view">
      <div className="roadmap-swimlane-column">
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
                {s.tickets.map((ticket, ticketIndex) => {
                  if (!ticket.start_date && !ticket.due_date) return null
                  const pos = getBarPosition(ticket.start_date, ticket.due_date)
                  const columnColor = ticket.columnName === 'Done' ? '#4ade80' :
                                     ticket.columnName === 'In Progress' ? '#3b82f6' :
                                     ticket.columnName === 'To Do' ? '#f59e0b' : '#9ca3af'

                  const barHeight = 24
                  const totalBars = s.tickets.filter(t => t.due_date).length
                  const verticalPos = (ticketIndex * barHeight) + (80 - totalBars * barHeight) / 2

                  const progress = ticketProgress[ticket.id]

                  // Use dragging bar if it's being dragged
                  const displayTicket = draggingBar?.id === ticket.id ? draggingBar : ticket
                  const displayPos = getBarPosition(displayTicket.start_date, displayTicket.due_date)

                  return (
                    <div
                      key={ticket.id}
                      className={`roadmap-bar ${draggingBar?.id === ticket.id ? 'dragging' : ''}`}
                      style={{
                        left: `${displayPos.leftPercent}%`,
                        width: `${displayPos.widthPercent}%`,
                        backgroundColor: columnColor,
                        top: `${verticalPos}px`,
                        height: `${barHeight}px`,
                        transform: 'none',
                        cursor: draggingBar?.id === ticket.id ? 'grabbing' : 'grab',
                      }}
                      onMouseDown={(e) => {
                        if (e.detail === 1) { // Single click for drag, double click to edit
                          handleBarMouseDown(e, ticket, e.currentTarget)
                        }
                      }}
                      onDoubleClick={() => {
                        onOpenTicket(ticket.id, ticket.title)
                      }}
                      title={ticket.title}
                    >
                      <span className="roadmap-bar-label">{ticket.title}</span>
                      {progress && (
                        <div className="roadmap-bar-progress">
                          <div className="roadmap-bar-progress-bar">
                            <div
                              className="roadmap-bar-progress-fill"
                              style={{ width: `${(progress.done / progress.total) * 100}%` }}
                            />
                          </div>
                          <span className="roadmap-bar-progress-text">{Math.round((progress.done / progress.total) * 100)}%</span>
                        </div>
                      )}
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
