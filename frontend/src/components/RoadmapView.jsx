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

  // Calculate today's position in the timeline
  let todayPercent = null
  if (minDate <= today && today <= maxDate) {
    const daysFromStart = Math.ceil((today - minDate) / (1000 * 60 * 60 * 24))
    todayPercent = (daysFromStart / totalDays) * 100
  }
  const timelineWidth = Math.max(1200, totalDays * 2) // at least 2px per day

  // Generate timeline headers (years and months with boundaries)
  const years = []
  const months = []
  const gridLines = []

  // First pass: collect all year and month data
  const yearData = {}
  const monthData = {}

  let currentDay = new Date(minDate)
  let dayCount = 0
  let lastYear = -1
  let lastMonth = -1
  let lastMonthYear = -1

  while (currentDay < maxDate) {
    const currentYear = currentDay.getFullYear()
    const currentMonth = currentDay.getMonth()
    const monthKey = `${currentYear}-${currentMonth}`
    const percent = (dayCount / totalDays) * 100

    // Track year
    if (currentYear !== lastYear) {
      if (lastYear !== -1) {
        yearData[lastYear].endPercent = percent
      }
      yearData[currentYear] = { startPercent: percent, year: currentYear }
      lastYear = currentYear
    }

    // Track month
    if (currentMonth !== lastMonth || currentYear !== lastMonthYear) {
      if (lastMonth !== -1) {
        const lastMonthKey = `${lastMonthYear}-${lastMonth}`
        monthData[lastMonthKey].endPercent = percent
      }
      monthData[monthKey] = {
        startPercent: percent,
        month: currentDay.toLocaleDateString('en-US', { month: 'short' }),
      }
      lastMonth = currentMonth
      lastMonthYear = currentYear
    }

    currentDay.setDate(currentDay.getDate() + 1)
    dayCount++
  }

  // Finalize last year and month
  if (lastYear !== -1) {
    yearData[lastYear].endPercent = 100
  }
  if (lastMonth !== -1) {
    const lastMonthKey = `${lastMonthYear}-${lastMonth}`
    monthData[lastMonthKey].endPercent = 100
  }

  // Convert to arrays and add grid lines
  Object.values(yearData).forEach(y => {
    years.push(y)
    gridLines.push({ percent: y.startPercent, isYear: true })
  })
  gridLines.push({ percent: 100, isYear: true })

  Object.values(monthData).forEach(m => {
    months.push(m)
    gridLines.push({ percent: m.startPercent, isMonth: true })
  })
  gridLines.push({ percent: 100, isMonth: true })

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

  const [headerRef, setHeaderRef] = useState(null)
  const [rowsRef, setRowsRef] = useState(null)

  // Sync scroll positions between header and rows
  useEffect(() => {
    const syncScroll = (source, target) => {
      if (target) {
        target.scrollLeft = source.scrollLeft
      }
    }

    if (headerRef) {
      headerRef.addEventListener('scroll', () => syncScroll(headerRef, rowsRef))
    }
    if (rowsRef) {
      rowsRef.addEventListener('scroll', () => syncScroll(rowsRef, headerRef))
    }

    return () => {
      if (headerRef) headerRef.removeEventListener('scroll', () => syncScroll(headerRef, rowsRef))
      if (rowsRef) rowsRef.removeEventListener('scroll', () => syncScroll(rowsRef, headerRef))
    }
  }, [headerRef, rowsRef])

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
        <div className="roadmap-timeline-header" ref={setHeaderRef}>
          {/* Years row */}
          <div className="roadmap-timeline-track roadmap-years-track" style={{ width: `${timelineWidth}px` }}>
            {years.map((year, idx) => (
              <div
                key={idx}
                className="roadmap-year"
                style={{
                  left: `${year.startPercent}%`,
                  right: `${100 - year.endPercent}%`,
                }}
              >
                <span className="roadmap-year-label">{year.year}</span>
              </div>
            ))}
          </div>

          {/* Months row */}
          <div className="roadmap-timeline-track roadmap-months-track" style={{ width: `${timelineWidth}px` }}>
            {months.map((month, idx) => (
              <div
                key={idx}
                className="roadmap-month"
                style={{
                  left: `${month.startPercent}%`,
                  right: `${100 - month.endPercent}%`,
                }}
              >
                <span className="roadmap-month-label">{month.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="roadmap-timeline-rows" ref={setRowsRef}>
          {/* Year and month boundary lines */}
          {gridLines.map((line, idx) => (
            <div
              key={`grid-${idx}`}
              className={`roadmap-grid-line ${line.isYear ? 'year-line' : line.isMonth ? 'month-line' : ''}`}
              style={{
                left: `${line.percent}%`,
              }}
            />
          ))}

          {todayPercent !== null && (
            <div
              className="roadmap-today-line"
              style={{
                left: `${todayPercent}%`,
              }}
            />
          )}
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
