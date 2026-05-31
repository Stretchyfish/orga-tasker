import Swimlane from './Swimlane'
import AddDepartmentForm from './AddDepartmentForm'

function Board({ departments, columns, tickets, onRefresh, onDeleteTicket, onRenameTicket, onDeleteDept, onRenameDept, onAddTag, onRemoveTag, onMoveTicket, onOpenTicket }) {
  const unassigned = tickets.filter(t => t.departments.length === 0)

  return (
    <div className="board">
      <AddDepartmentForm onRefresh={onRefresh} />

      <div className="board-column-headers">
        <div className="swimlane-label-spacer" />
        {columns.map(col => (
          <div key={col.id} className="board-column-header">{col.name}</div>
        ))}
      </div>

      {departments.map(dept => (
        <Swimlane
          key={dept.id}
          department={dept}
          columns={columns}
          tickets={tickets.filter(t => t.departments.includes(dept.name))}
          departments={departments}
          onRefresh={onRefresh}
          onDeleteTicket={onDeleteTicket}
          onRenameTicket={onRenameTicket}
          onDeleteDept={onDeleteDept}
          onRenameDept={onRenameDept}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onMoveTicket={onMoveTicket}
          onOpenTicket={onOpenTicket}
        />
      ))}

      {unassigned.length > 0 && (
        <Swimlane
          key="__unassigned__"
          department={null}
          columns={columns}
          tickets={unassigned}
          departments={departments}
          onRefresh={onRefresh}
          onDeleteTicket={onDeleteTicket}
          onRenameTicket={onRenameTicket}
          onDeleteDept={onDeleteDept}
          onRenameDept={onRenameDept}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onMoveTicket={onMoveTicket}
          onOpenTicket={onOpenTicket}
        />
      )}
    </div>
  )
}

export default Board
