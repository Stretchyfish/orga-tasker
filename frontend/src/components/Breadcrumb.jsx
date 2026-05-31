function Breadcrumb({ stack, onNavigate }) {
  if (stack.length <= 1) return null

  return (
    <nav className="breadcrumb">
      {stack.map((item, i) => (
        <span key={i} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          {i < stack.length - 1 ? (
            <button className="breadcrumb-link" onClick={() => onNavigate(i)}>
              {item.label}
            </button>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export default Breadcrumb
