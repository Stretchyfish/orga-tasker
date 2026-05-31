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
              due_date: ticket.due_date,
            }))
          )
        )
      })
  }, [])

  useEffect(() => {
    loadData(currentBoardId)
  }, [loadData, currentBoardId])

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
    loadData(currentBoardId)
  }

  async function removeTag(ticketId, tagId) {
    await fetch(`http://localhost:3000/tickets/${ticketId}/tags/${tagId}`, { method: 'DELETE' })
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

  async function openTicketBoard(ticketId, ticketTitle) {
    const res = await fetch(`http://localhost:3000/tickets/${ticketId}/board`)
    const board = await res.json()
    const currentTicket = tickets.find(t => t.id === ticketId)
    setBoardStack(prev => [...prev, { id: board.id, label: ticketTitle, ticketId, description: currentTicket?.description || '' }])
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

  function navigateTo(index) {
    setBoardStack(prev => prev.slice(0, index + 1))
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
          onRefresh={() => loadData(currentBoardId)}
          onDeleteTicket={deleteTicket}
          onRenameTicket={renameTicket}
          onUpdateDescription={updateTicketDescription}
          onUpdateDate={updateTicketDate}
          onDeleteTag={deleteTag}
          onRenameTag={renameTag}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onMoveTicket={moveTicket}
          onAddSwimlane={addBoardSwimlane}
          onRemoveSwimlane={removeBoardSwimlane}
          onToggleUntagged={() => setShowUntagged(s => !s)}
          onOpenTicket={openTicketBoard}
        />
      </main>
    </div>
  )
}

export default App
