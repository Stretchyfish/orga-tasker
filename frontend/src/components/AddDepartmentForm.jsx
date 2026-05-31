import { useState } from 'react'

function AddDepartmentForm({ onRefresh }) {
  const [name, setName] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    await fetch('http://localhost:3000/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    setName('')
    onRefresh()
  }

  return (
    <form onSubmit={handleSubmit} className="add-dept-form">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Department name"
      />
      <button type="submit">Add Department</button>
    </form>
  )
}

export default AddDepartmentForm
