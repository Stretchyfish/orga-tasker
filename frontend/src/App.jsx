import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import Breadcrumb from './components/Breadcrumb'
import Board from './components/Board'
import './App.css'

function App() {
  const [companyName, setCompanyName] = useState('Loading...')
  const [allTags, setAllTags] = useState([])
  const [columns, setColumns] = useState([])
  const [tickets, setTickets] = useState([])
  const [swimlaneTags, setSwimlaneTags] = useState([])
  const [showUntagged, setShowUntagged] = useState(true)
  const [boardStack, setBoardStack] = useState([{ id: 1, label: 'Main Board' }])
  const [viewMode, setViewMode] = useState('kanban')

  function setView(mode) {
    setViewMode(mode)
  }

  function toggleViewMode() {
    const modes = ['kanban', 'roadmap', 'calendar']
    const currentIndex = modes.indexOf(viewMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setViewMode(modes[nextIndex])
  }

  const currentBoardId = boardStack[boardStack.length - 1].id

  const loadData = useCallback((boardId) => {
    fetch('http://localhost:3000/company')
      .then(res => res.json())
      .then(data => setCompanyName(data.name))

    fetch('http://localhost:3000/tags')
      .then(res => res.json())
      .then(setAllTags)

    fetch(`http://localhost:3000/boards/${boardId}/swimlanes`)
      .then(res => res.json())
      .then(setSwimlaneTags)

    fetch(`http://localhost:3000/boards/${boardId}`)
      .then(res => res.json())
      .then(board => {
        setColumns(board.columns.map(c => ({ id: c.id, name: c.name })))
        setTickets(
          board.columns.flatMap(col =>
            col.tickets.map(ticket => ({
              id: ticket.id,
              title: ticket.title,
              columnId: col.id,
              columnName: col.name,
              tags: ticket.tags.map(t => t.name),
              start_date: ticket.start_date,
              due_date: ticket.due_date,
            }))
          )
        )
      })
  }, [])

  useEffect(() => {
    loadData(currentBoardId)
  }, [loadData, currentBoardId])

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.boardStack) {
        setBoardStack(event.state.boardStack)
      } else {
        // Back to main board
        setBoardStack([{ id: 1, label: 'Main Board' }])
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  async function renameCompany(name) {
    await fetch('http://localhost:3000/company', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setCompanyName(name)
  }

  async function deleteTicket(ticketId) {
    await fetch(`http://localhost:3000/tickets/${ticketId}`, { method: 'DELETE' })
    loadData(currentBoardId)
  }

  async function renameTicket(ticketId, title) {
    await fetch(`http://localhost:3000/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    loadData(currentBoardId)
  }

  async function deleteTag(tagId) {
    await fetch(`http://localhost:3000/tags/${tagId}`, { method: 'DELETE' })
    loadData(currentBoardId)
  }

  async function renameTag(tagId, name) {
    await fetch(`http://localhost:3000/tags/${tagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    loadData(currentBoardId)
  }

  async function addTag(ticketId, tagId) {
    await fetch(`http://localhost:3000/tickets/${ticketId}/tags/${tagId}`, { method: 'POST' })
    const tag = allTags.find(t => t.id === tagId)
    if (tag) {
      setTickets(prev =>
        prev.map(t => t.id === ticketId ? { ...t, tags: [...t.tags, tag.name] } : t)
      )
      setBoardStack(prev =>
        prev.map(item =>
          item.ticketId === ticketId ? { ...item, tags: [...(item.tags || []), tag.name] } : item
        )
      )
    }
    loadData(currentBoardId)
  }

  async function removeTag(ticketId, tagId) {
    await fetch(`http://localhost:3000/tickets/${ticketId}/tags/${tagId}`, { method: 'DELETE' })
    const tag = allTags.find(t => t.id === tagId)
    if (tag) {
      setTickets(prev =>
        prev.map(t => t.id === ticketId ? { ...t, tags: t.tags.filter(tn => tn !== tag.name) } : t)
      )
      setBoardStack(prev =>
        prev.map(item =>
          item.ticketId === ticketId ? { ...item, tags: (item.tags || []).filter(tn => tn !== tag.name) } : item
        )
      )
    }
    loadData(currentBoardId)
  }

  async function moveTicket(ticketId, columnId) {
    await fetch(`http://localhost:3000/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_id: columnId }),
    })
    loadData(currentBoardId)
  }

  async function addBoardSwimlane(tagId) {
    await fetch(`http://localhost:3000/boards/${currentBoardId}/swimlanes/${tagId}`, { method: 'POST' })
    loadData(currentBoardId)
  }

  async function removeBoardSwimlane(tagId) {
    await fetch(`http://localhost:3000/boards/${currentBoardId}/swimlanes/${tagId}`, { method: 'DELETE' })
    loadData(currentBoardId)
  }

  async function updateSwimlaneOrder(swimlaneOrders) {
    await fetch(`http://localhost:3000/boards/${currentBoardId}/swimlanes/order`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ swimlane_orders: swimlaneOrders }),
    })
    loadData(currentBoardId)
  }

  async function openTicketBoard(ticketId, ticketTitle) {
    const res = await fetch(`http://localhost:3000/tickets/${ticketId}/board`)
    const board = await res.json()
    const currentTicket = tickets.find(t => t.id === ticketId)
    const newBoardStack = [...boardStack, {
      id: board.id,
      label: ticketTitle,
      ticketId,
      description: currentTicket?.description || '',
      start_date: currentTicket?.start_date,
      due_date: currentTicket?.due_date,
      tags: currentTicket?.tags || [],
    }]
    setBoardStack(newBoardStack)
    window.history.pushState({ boardStack: newBoardStack }, ticketTitle)
  }

  async function updateTicketDescription(ticketId, description) {
    await fetch(`http://localhost:3000/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    })
    // Update the boardStack with the new description
    setBoardStack(prev =>
      prev.map((item, idx) =>
        idx === prev.length - 1 ? { ...item, description } : item
      )
    )
  }

  async function updateTicketDate(ticketId, due_date) {
    await fetch(`http://localhost:3000/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ due_date }),
    })
    setTickets(prev =>
      prev.map(t => t.id === ticketId ? { ...t, due_date } : t)
    )
    // Update boardStack if this is the current parent ticket
    setBoardStack(prev =>
      prev.map((item, idx) =>
        item.ticketId === ticketId ? { ...item, due_date } : item
      )
    )
  }

  async function updateTicketStartDate(ticketId, start_date) {
    await fetch(`http://localhost:3000/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date }),
    })
    setTickets(prev =>
      prev.map(t => t.id === ticketId ? { ...t, start_date } : t)
    )
    // Update boardStack if this is the current parent ticket
    setBoardStack(prev =>
      prev.map((item, idx) =>
        item.ticketId === ticketId ? { ...item, start_date } : item
      )
    )
  }

  function navigateTo(index) {
    const newStack = boardStack.slice(0, index + 1)
    setBoardStack(newStack)
    const state = index === 0 ? null : { boardStack: newStack }
    window.history.pushState(state, '')
  }

  return (
    <div className="app">
      <Header companyName={companyName} onRename={renameCompany} />
      <main className="main">
        <Breadcrumb stack={boardStack} onNavigate={navigateTo} />
        <Board
          parentTicket={boardStack.length > 1 ? boardStack[boardStack.length - 1] : null}
          allTags={allTags}
          swimlaneTags={swimlaneTags}
          columns={columns}
          tickets={tickets}
          showUntagged={showUntagged}
          viewMode={viewMode}
          onRefresh={() => loadData(currentBoardId)}
          onDeleteTicket={deleteTicket}
          onRenameTicket={renameTicket}
          onUpdateDescription={updateTicketDescription}
          onUpdateDate={updateTicketDate}
          onUpdateStartDate={updateTicketStartDate}
          onDeleteTag={deleteTag}
          onRenameTag={renameTag}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onMoveTicket={moveTicket}
          onAddSwimlane={addBoardSwimlane}
          onRemoveSwimlane={removeBoardSwimlane}
          onUpdateSwimlaneOrder={updateSwimlaneOrder}
          onToggleUntagged={() => setShowUntagged(s => !s)}
          onSetView={setView}
          onToggleView={toggleViewMode}
          onOpenTicket={openTicketBoard}
        />
      </main>
    </div>
  )
}

export default App
