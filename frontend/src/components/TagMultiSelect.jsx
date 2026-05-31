import { useState, useRef, useEffect } from 'react'

function TagMultiSelect({ tags, selectedTags, onChange }) {
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

  function toggle(tagId) {
    onChange(
      selectedTags.includes(tagId)
        ? selectedTags.filter(id => id !== tagId)
        : [...selectedTags, tagId]
    )
  }

  const label = selectedTags.length === 0
    ? 'Untagged'
    : tags
        .filter(t => selectedTags.includes(t.id))
        .map(t => t.name)
        .join(', ')

  return (
    <div className="tag-multi-select" ref={ref}>
      <button
        type="button"
        className="tag-multi-select-btn"
        onClick={() => setOpen(o => !o)}
      >
        <span>{label}</span>
        <span className="tag-multi-select-arrow">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="tag-multi-select-dropdown">
          {tags.map(t => (
            <label key={t.id} className="tag-multi-select-option">
              <input
                type="checkbox"
                checked={selectedTags.includes(t.id)}
                onChange={() => toggle(t.id)}
              />
              {t.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default TagMultiSelect
