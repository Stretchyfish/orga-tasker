import Column from './Column'

function Swimlane({ department, columns, tickets, departments, onRefresh }) {
  return (
    <div className="swimlane">
      <div className="swimlane-label">
        {department ? department.name : 'Unassigned'}
      </div>
      <div className="swimlane-columns">
        {columns.map(col => (
          <Column
            key={col.id}
            column={col}
            tickets={tickets.filter(t => t.columnName === col.name)}
            departments={departments}
            defaultDeptId={department ? String(department.id) : ''}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  )
}

export default Swimlane
