import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import Breadcrumb from './components/Breadcrumb'
import Board from './components/Board'
import './App.css'

function App() {
  const [companyName, setCompanyName] = useState('Loading...')
  const [departments, setDepartments] = useState([])
  const [columns, setColumns] = useState([])
  const [tickets, setTickets] = useState([])
  const [boardStack, setBoardStack] = useState([{ id: 1, label: 'Main Board' }])

  const currentBoardId = boardStack[boardStack.length - 1].id

  const loadData = useCallback((boardId) => {
    fetch('http://localhost:3000/company')
      .then(res => res.json())
      .then(data => setCompanyName(data.name))

    fetch('http://localhost:3000/departments')
      .then(res => res.json())
      .then(setDepartments)

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
              departments: ticket.departments.map(d => d.name),
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

  async function deleteDepartment(deptId) {
    await fetch(`http://localhost:3000/departments/${deptId}`, { method: 'DELETE' })
    loadData(currentBoardId)
  }

  async function renameDepartment(deptId, name) {
    await fetch(`http://localhost:3000/departments/${deptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    loadData(currentBoardId)
  }

  async function addTag(ticketId, deptId) {
    await fetch(`http://localhost:3000/tickets/${ticketId}/departments/${deptId}`, { method: 'POST' })
    loadData(currentBoardId)
  }

  async function removeTag(ticketId, deptId) {
    await fetch(`http://localhost:3000/tickets/${ticketId}/departments/${deptId}`, { method: 'DELETE' })
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

  async function openTicketBoard(ticketId, ticketTitle) {
    const res = await fetch(`http://localhost:3000/tickets/${ticketId}/board`)
    const board = await res.json()
    setBoardStack(prev => [...prev, { id: board.id, label: ticketTitle }])
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
          departments={departments}
          columns={columns}
          tickets={tickets}
          onRefresh={() => loadData(currentBoardId)}
          onDeleteTicket={deleteTicket}
          onRenameTicket={renameTicket}
          onDeleteDept={deleteDepartment}
          onRenameDept={renameDepartment}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onMoveTicket={moveTicket}
          onOpenTicket={openTicketBoard}
        />
      </main>
    </div>
  )
}

export default App
