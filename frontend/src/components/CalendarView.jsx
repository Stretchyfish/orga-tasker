import { useState, useEffect } from 'react'

function CalendarView({ swimlaneTags, tickets, allTags, showUntagged, ticketProgress, onUpdateStartDate, onUpdateDate, onRenameTicket, onToggleView, onOpenTicket }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [draggingBar, setDraggingBar] = useState(null)
  const [dragType, setDragType] = useState(null)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragOriginalDates, setDragOriginalDates] = useState(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get dates for the calendar
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const datedTickets = tickets.filter(t => t.due_date)
  const swimlaneTickets = swimlaneTags.map(tag => ({
    tag,
    tickets: datedTickets.filter(t => t.tags.includes(tag.name)),
  }))
  if (showUntagged) {
    const untagged = datedTickets.filter(t => t.tags.length === 0)
    swimlaneTickets.push({ tag: null, tickets: untagged })
  }

  function formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.getDate()
  }

  function parseDateString(dateStr) {
    if (!dateStr) return null
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date
  }

  function isDateInRange(dateStr, ticketStart, ticketEnd) {
    if (!dateStr) return false
    const checkDate = parseDateString(dateStr)
    const start = ticketStart ? parseDateString(ticketStart) : today
    const end = ticketEnd ? parseDateString(ticketEnd) : today
    return checkDate >= start && checkDate <= end
  }

  function getDaysInRange(ticketStart, ticketEnd) {
    const start = ticketStart ? parseDateString(ticketStart) : today
    const end = ticketEnd ? parseDateString(ticketEnd) : today
    const days = []
    const current = new Date(start)
    while (current <= end) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
      days.push(dateStr)
      current.setDate(current.getDate() + 1)
    }
    return days
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
  }, [draggingBar, dragType, dragStartX, dragOriginalDates])

  function handleBarMouseDown(e, ticket, barElement) {
    if (e.button !== 0) return

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
    const daysDelta = Math.round(deltaX / 40) // Approximately 40px per day in calendar

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

  const days = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>←</button>
        <h2>{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>→</button>
        <button className="view-toggle-btn" onClick={onToggleView} style={{ marginLeft: 'auto' }} title="Switch views">
          📊 Kanban
        </button>
      </div>

      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
        </div>

        {weeks.map((week, weekIdx) => {
          // Find the actual date range for this week
          let weekStartDay = null
          let weekEndDay = null
          for (let i = 0; i < week.length; i++) {
            if (week[i] !== null && weekStartDay === null) weekStartDay = week[i]
            if (week[i] !== null) weekEndDay = week[i]
          }

          const weekStart = weekStartDay ? new Date(year, month, weekStartDay) : new Date(year, month - 1, 1)
          const weekEnd = weekEndDay ? new Date(year, month, weekEndDay + 1) : new Date(year, month + 1, 1)

          return (
            <div key={weekIdx} className="calendar-week">
              <div className="calendar-week-days">
                {week.map((day, dayIdx) => {
                  if (!day) {
                    return <div key={`empty-${dayIdx}`} className="calendar-day empty" />
                  }

                  return (
                    <div key={day} className="calendar-day">
                      <div className="calendar-day-number">{day}</div>
                    </div>
                  )
                })}
              </div>

              <div className="calendar-week-events">
                {swimlaneTickets.map((s) => (
                  s.tickets.map(ticket => {
                    const displayTicket = draggingBar?.id === ticket.id ? draggingBar : ticket
                    if (!displayTicket.due_date) return null

                    const ticketStart = displayTicket.start_date ? parseDateString(displayTicket.start_date) : today
                    const ticketEnd = displayTicket.due_date ? parseDateString(displayTicket.due_date) : today

                    // Check if ticket has any days in this specific week array
                    const hasOverlapInWeek = week.some(day => {
                      if (!day) return false
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      return isDateInRange(dateStr, displayTicket.start_date, displayTicket.due_date)
                    })

                    if (!hasOverlapInWeek) {
                      return null
                    }

                    // Calculate position and width within the week
                    const eventStart = ticketStart < weekStart ? weekStart : ticketStart
                    const eventEnd = ticketEnd > weekEnd ? weekEnd : ticketEnd

                    const dayOffset = Math.floor((eventStart - weekStart) / (1000 * 60 * 60 * 24))
                    const daySpan = Math.ceil((eventEnd - eventStart) / (1000 * 60 * 60 * 24)) + 1

                    const isEventStart = ticketStart >= weekStart && ticketStart <= weekEnd
                    const isEventEnd = ticketEnd >= weekStart && ticketEnd <= weekEnd

                    const columnColor = ticket.columnName === 'Done' ? '#4ade80' :
                                      ticket.columnName === 'In Progress' ? '#3b82f6' :
                                      ticket.columnName === 'To Do' ? '#f59e0b' : '#9ca3af'

                    const progress = ticketProgress[ticket.id]

                    return (
                      <div
                        key={`${ticket.id}-${weekIdx}`}
                        className={`calendar-event ${isEventStart ? 'event-start' : ''} ${isEventEnd ? 'event-end' : ''} ${draggingBar?.id === ticket.id ? 'dragging' : ''}`}
                        style={{
                          backgroundColor: columnColor,
                          gridColumn: `${dayOffset + 1} / span ${daySpan}`,
                        }}
                        onMouseDown={(e) => handleBarMouseDown(e, ticket, e.currentTarget)}
                        onDoubleClick={() => onOpenTicket(ticket.id, ticket.title)}
                        title={ticket.title}
                      >
                        <span className="event-title">{ticket.title}</span>
                        {progress && (
                          <div className="calendar-event-progress">
                            <div className="calendar-event-progress-bar">
                              <div
                                className="calendar-event-progress-fill"
                                style={{ width: `${(progress.done / progress.total) * 100}%` }}
                              />
                            </div>
                            <span className="calendar-event-progress-text">{Math.round((progress.done / progress.total) * 100)}%</span>
                          </div>
                        )}
                      </div>
                    )
                  })
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarView
