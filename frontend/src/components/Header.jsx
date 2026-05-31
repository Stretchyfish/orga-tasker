import { useState } from 'react'

function Header({ companyName, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEditing() {
    setDraft(companyName)
    setEditing(true)
  }

  async function save() {
    const name = draft.trim()
    if (name && name !== companyName) {
      await onRename(name)
    }
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <header className="header">
      {editing ? (
        <input
          className="header-title-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <h1 className="header-title" onClick={startEditing} title="Click to rename">
          {companyName}
        </h1>
      )}
    </header>
  )
}

export default Header
