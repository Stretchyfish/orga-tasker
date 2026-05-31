import { useState } from 'react'

function AddTagForm({ onRefresh }) {
  const [name, setName] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    await fetch('http://localhost:3000/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    setName('')
    onRefresh()
  }

  return (
    <form onSubmit={handleSubmit} className="add-tag-form">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Tag name"
      />
      <button type="submit">Add Tag</button>
    </form>
  )
}

export default AddTagForm
