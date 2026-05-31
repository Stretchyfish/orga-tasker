import { useState, useRef, useEffect } from 'react'

function DeptMultiSelect({ departments, selectedDepts, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close when clicking outside the component
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

  function toggle(deptId) {
    onChange(
      selectedDepts.includes(deptId)
        ? selectedDepts.filter(id => id !== deptId)
        : [...selectedDepts, deptId]
    )
  }

  const label = selectedDepts.length === 0
    ? 'Unassigned'
    : departments
        .filter(d => selectedDepts.includes(d.id))
        .map(d => d.name)
        .join(', ')

  return (
    <div className="dept-multi-select" ref={ref}>
      <button
        type="button"
        className="dept-multi-select-btn"
        onClick={() => setOpen(o => !o)}
      >
        <span>{label}</span>
        <span className="dept-multi-select-arrow">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="dept-multi-select-dropdown">
          {departments.map(d => (
            <label key={d.id} className="dept-multi-select-option">
              <input
                type="checkbox"
                checked={selectedDepts.includes(d.id)}
                onChange={() => toggle(d.id)}
              />
              {d.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default DeptMultiSelect
