import { useState, useRef, useEffect } from 'react'

function SwimlaneSelector({ availableTags, onAdd }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  function handleSelect(tagId, tagName) {
    onAdd(tagId)
    setOpen(false)
  }

  if (availableTags.length === 0) return null

  return (
    <div className="swimlane-selector" ref={ref}>
      <button
        type="button"
        className="swimlane-selector-btn"
        onClick={() => setOpen(o => !o)}
      >
        <span>+ Add swimlane</span>
        <span className="swimlane-selector-arrow">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="swimlane-selector-dropdown">
          {availableTags.map(tag => (
            <button
              key={tag.id}
              type="button"
              className="swimlane-selector-option"
              onClick={() => handleSelect(tag.id, tag.name)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SwimlaneSelector
