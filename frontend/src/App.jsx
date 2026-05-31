import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import Board from './components/Board'
import './App.css'

function App() {
  const [companyName, setCompanyName] = useState('Loading...')
  const [departments, setDepartments] = useState([])
  const [columns, setColumns] = useState([])
  const [tickets, setTickets] = useState([])

  const loadData = useCallback(() => {
    fetch('http://localhost:3000/company')
      .then(res => res.json())
      .then(data => setCompanyName(data.name))

    fetch('http://localhost:3000/departments')
      .then(res => res.json())
      .then(setDepartments)

    fetch('http://localhost:3000/boards/1')
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
    loadData()
  }, [loadData])

  return (
    <div className="app">
      <Header companyName={companyName} />
      <main className="main">
        <Board
          departments={departments}
          columns={columns}
          tickets={tickets}
          onRefresh={loadData}
        />
      </main>
    </div>
  )
}

export default App
