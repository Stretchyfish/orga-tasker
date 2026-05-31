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
      <Header companyName={companyName} />
      <main className="main">
        <Breadcrumb stack={boardStack} onNavigate={navigateTo} />
        <Board
          departments={departments}
          columns={columns}
          tickets={tickets}
          onRefresh={() => loadData(currentBoardId)}
          onOpenTicket={openTicketBoard}
        />
      </main>
    </div>
  )
}

export default App
