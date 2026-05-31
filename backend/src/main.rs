use tower_http::cors::CorsLayer;

// --- Database row types ---

#[derive(serde::Serialize, sqlx::FromRow)]
struct Company {
    id: i64,
    name: String,
}


#[derive(serde::Serialize, sqlx::FromRow)]
struct Department {
    id: i64,
    name: String,
}

#[derive(serde::Serialize, sqlx::FromRow)]
struct BoardSummary {
    id: i64,
    name: String,
    parent_ticket_id: Option<i64>,
}

#[derive(sqlx::FromRow)]
struct ColumnRow {
    id: i64,
    name: String,
    position: i64,
}

#[derive(sqlx::FromRow)]
struct TicketRow {
    id: i64,
    title: String,
    description: Option<String>,
    position: i64,
}

// --- Request body types ---

#[derive(serde::Deserialize)]
struct CreateDepartment {
    name: String,
}

#[derive(serde::Deserialize)]
struct CreateTicket {
    column_id: i64,
    title: String,
    description: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateTicket {
    column_id: Option<i64>,
    title: Option<String>,
    description: Option<String>,
}

// --- Response types ---

#[derive(serde::Serialize)]
struct BoardResponse {
    id: i64,
    name: String,
    parent_ticket_id: Option<i64>,
    columns: Vec<ColumnResponse>,
}

#[derive(serde::Serialize)]
struct ColumnResponse {
    id: i64,
    name: String,
    position: i64,
    tickets: Vec<TicketResponse>,
}

#[derive(serde::Serialize)]
struct TicketResponse {
    id: i64,
    title: String,
    description: Option<String>,
    position: i64,
    departments: Vec<Department>,
}

// --- Server setup ---

#[tokio::main]
async fn main() {
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .connect_with(
            sqlx::sqlite::SqliteConnectOptions::new()
                .filename("data.db")
                .create_if_missing(true),
        )
        .await
        .expect("Failed to connect to database");

    init_db(&pool).await;

    let app = axum::Router::new()
        .route("/", axum::routing::get(hello_handler))
        .route("/departments", axum::routing::get(list_departments))
        .route("/departments", axum::routing::post(create_department))
        .route("/boards", axum::routing::get(list_boards))
        .route("/boards/:id", axum::routing::get(get_board))
        .route("/tickets", axum::routing::post(create_ticket))
        .route("/tickets/:id", axum::routing::patch(update_ticket))
        .route("/tickets/:id/departments/:dept_id", axum::routing::post(tag_department))
        .route("/tickets/:id/departments/:dept_id", axum::routing::delete(untag_department))
        .route("/tickets/:id/board", axum::routing::get(get_or_create_subboard))
        .route("/company", axum::routing::get(get_company))
        .layer(CorsLayer::permissive())
        .with_state(pool);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Server running on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}

// --- Database initialisation ---

async fn init_db(pool: &sqlx::SqlitePool) {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS companies (
            id   INTEGER PRIMARY KEY,
            name TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create companies table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS departments (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create departments table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS boards (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            name             TEXT NOT NULL,
            parent_ticket_id INTEGER REFERENCES tickets(id)
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create boards table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS columns (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            board_id INTEGER NOT NULL REFERENCES boards(id),
            name     TEXT NOT NULL,
            position INTEGER NOT NULL DEFAULT 0
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create columns table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS tickets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            column_id   INTEGER NOT NULL REFERENCES columns(id),
            title       TEXT NOT NULL,
            description TEXT,
            position    INTEGER NOT NULL DEFAULT 0
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create tickets table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS ticket_departments (
            ticket_id     INTEGER NOT NULL REFERENCES tickets(id),
            department_id INTEGER NOT NULL REFERENCES departments(id),
            PRIMARY KEY (ticket_id, department_id)
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create ticket_departments table");

    let company_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM companies")
        .fetch_one(pool)
        .await
        .expect("Failed to count companies");

    if company_count == 0 {
        sqlx::query("INSERT INTO companies (id, name) VALUES (1, ?)")
            .bind("My Company")
            .execute(pool)
            .await
            .expect("Failed to seed company");

        let board_id: i64 = sqlx::query_scalar(
            "INSERT INTO boards (name, parent_ticket_id) VALUES ('Main Board', NULL) RETURNING id",
        )
        .fetch_one(pool)
        .await
        .expect("Failed to seed root board");

        for (pos, name) in ["To Do", "In Progress", "Done"].iter().enumerate() {
            sqlx::query("INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)")
                .bind(board_id)
                .bind(name)
                .bind(pos as i64)
                .execute(pool)
                .await
                .expect("Failed to seed column");
        }

        println!("Seeded: company, root board, and columns (To Do / In Progress / Done)");
    }
}

// --- Handlers ---

async fn hello_handler() -> &'static str {
    "Hello from orga-tasker!"
}

async fn list_departments(
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> axum::Json<Vec<Department>> {
    let departments: Vec<Department> = sqlx::query_as("SELECT id, name FROM departments")
        .fetch_all(&pool)
        .await
        .expect("Failed to fetch departments");

    axum::Json(departments)
}

async fn create_department(
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
    axum::Json(body): axum::Json<CreateDepartment>,
) -> (axum::http::StatusCode, axum::Json<Department>) {
    let id: i64 = sqlx::query_scalar("INSERT INTO departments (name) VALUES (?) RETURNING id")
        .bind(&body.name)
        .fetch_one(&pool)
        .await
        .expect("Failed to insert department");

    (
        axum::http::StatusCode::CREATED,
        axum::Json(Department { id, name: body.name }),
    )
}

async fn list_boards(
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> axum::Json<Vec<BoardSummary>> {
    let boards: Vec<BoardSummary> =
        sqlx::query_as("SELECT id, name, parent_ticket_id FROM boards")
            .fetch_all(&pool)
            .await
            .expect("Failed to fetch boards");

    axum::Json(boards)
}

async fn get_board(
    axum::extract::Path(board_id): axum::extract::Path<i64>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> Result<axum::Json<BoardResponse>, axum::http::StatusCode> {
    let board: Option<BoardSummary> =
        sqlx::query_as("SELECT id, name, parent_ticket_id FROM boards WHERE id = ?")
            .bind(board_id)
            .fetch_optional(&pool)
            .await
            .expect("Failed to fetch board");

    let board = match board {
        Some(b) => b,
        None => return Err(axum::http::StatusCode::NOT_FOUND),
    };

    let column_rows: Vec<ColumnRow> = sqlx::query_as(
        "SELECT id, name, position FROM columns WHERE board_id = ? ORDER BY position",
    )
    .bind(board_id)
    .fetch_all(&pool)
    .await
    .expect("Failed to fetch columns");

    let mut columns = Vec::new();
    for col in column_rows {
        let ticket_rows: Vec<TicketRow> = sqlx::query_as(
            "SELECT id, title, description, position
             FROM tickets WHERE column_id = ? ORDER BY position",
        )
        .bind(col.id)
        .fetch_all(&pool)
        .await
        .expect("Failed to fetch tickets");

        let mut tickets = Vec::new();
        for ticket in ticket_rows {
            let departments: Vec<Department> = sqlx::query_as(
                "SELECT d.id, d.name
                 FROM departments d
                 JOIN ticket_departments td ON td.department_id = d.id
                 WHERE td.ticket_id = ?",
            )
            .bind(ticket.id)
            .fetch_all(&pool)
            .await
            .expect("Failed to fetch ticket departments");

            tickets.push(TicketResponse {
                id: ticket.id,
                title: ticket.title,
                description: ticket.description,
                position: ticket.position,
                departments,
            });
        }

        columns.push(ColumnResponse {
            id: col.id,
            name: col.name,
            position: col.position,
            tickets,
        });
    }

    Ok(axum::Json(BoardResponse {
        id: board.id,
        name: board.name,
        parent_ticket_id: board.parent_ticket_id,
        columns,
    }))
}

async fn create_ticket(
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
    axum::Json(body): axum::Json<CreateTicket>,
) -> (axum::http::StatusCode, axum::Json<TicketResponse>) {
    let position: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM tickets WHERE column_id = ?")
            .bind(body.column_id)
            .fetch_one(&pool)
            .await
            .expect("Failed to count tickets");

    let id: i64 = sqlx::query_scalar(
        "INSERT INTO tickets (column_id, title, description, position) VALUES (?, ?, ?, ?) RETURNING id",
    )
    .bind(body.column_id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(position)
    .fetch_one(&pool)
    .await
    .expect("Failed to insert ticket");

    (
        axum::http::StatusCode::CREATED,
        axum::Json(TicketResponse {
            id,
            title: body.title,
            description: body.description,
            position,
            departments: vec![],
        }),
    )
}

async fn update_ticket(
    axum::extract::Path(ticket_id): axum::extract::Path<i64>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
    axum::Json(body): axum::Json<UpdateTicket>,
) -> Result<axum::Json<TicketResponse>, axum::http::StatusCode> {
    if let Some(column_id) = body.column_id {
        sqlx::query("UPDATE tickets SET column_id = ? WHERE id = ?")
            .bind(column_id)
            .bind(ticket_id)
            .execute(&pool)
            .await
            .expect("Failed to update ticket column");
    }

    if let Some(ref title) = body.title {
        sqlx::query("UPDATE tickets SET title = ? WHERE id = ?")
            .bind(title)
            .bind(ticket_id)
            .execute(&pool)
            .await
            .expect("Failed to update ticket title");
    }

    if let Some(ref description) = body.description {
        sqlx::query("UPDATE tickets SET description = ? WHERE id = ?")
            .bind(description)
            .bind(ticket_id)
            .execute(&pool)
            .await
            .expect("Failed to update ticket description");
    }

    let ticket: Option<TicketRow> =
        sqlx::query_as("SELECT id, title, description, position FROM tickets WHERE id = ?")
            .bind(ticket_id)
            .fetch_optional(&pool)
            .await
            .expect("Failed to fetch updated ticket");

    let ticket = match ticket {
        Some(t) => t,
        None => return Err(axum::http::StatusCode::NOT_FOUND),
    };

    let departments: Vec<Department> = sqlx::query_as(
        "SELECT d.id, d.name FROM departments d
         JOIN ticket_departments td ON td.department_id = d.id
         WHERE td.ticket_id = ?",
    )
    .bind(ticket_id)
    .fetch_all(&pool)
    .await
    .expect("Failed to fetch ticket departments");

    Ok(axum::Json(TicketResponse {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        position: ticket.position,
        departments,
    }))
}

async fn tag_department(
    axum::extract::Path((ticket_id, dept_id)): axum::extract::Path<(i64, i64)>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> axum::http::StatusCode {
    let result = sqlx::query(
        "INSERT OR IGNORE INTO ticket_departments (ticket_id, department_id) VALUES (?, ?)",
    )
    .bind(ticket_id)
    .bind(dept_id)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => axum::http::StatusCode::NO_CONTENT,
        Err(e) => {
            eprintln!("tag_department failed (ticket={ticket_id}, dept={dept_id}): {e}");
            axum::http::StatusCode::UNPROCESSABLE_ENTITY
        }
    }
}

async fn untag_department(
    axum::extract::Path((ticket_id, dept_id)): axum::extract::Path<(i64, i64)>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> axum::http::StatusCode {
    sqlx::query(
        "DELETE FROM ticket_departments WHERE ticket_id = ? AND department_id = ?",
    )
    .bind(ticket_id)
    .bind(dept_id)
    .execute(&pool)
    .await
    .expect("Failed to untag department");

    axum::http::StatusCode::NO_CONTENT
}

async fn get_or_create_subboard(
    axum::extract::Path(ticket_id): axum::extract::Path<i64>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> Result<axum::Json<BoardResponse>, axum::http::StatusCode> {
    let exists: Option<BoardSummary> = sqlx::query_as(
        "SELECT id, name, parent_ticket_id FROM boards WHERE parent_ticket_id = ?",
    )
    .bind(ticket_id)
    .fetch_optional(&pool)
    .await
    .expect("Failed to check for subboard");

    let board_id = match exists {
        Some(b) => b.id,
        None => {
            let new_id: i64 = sqlx::query_scalar(
                "INSERT INTO boards (name, parent_ticket_id) VALUES ('Sub Board', ?) RETURNING id",
            )
            .bind(ticket_id)
            .fetch_one(&pool)
            .await
            .expect("Failed to create subboard");

            for (pos, name) in ["To Do", "In Progress", "Done"].iter().enumerate() {
                sqlx::query(
                    "INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)",
                )
                .bind(new_id)
                .bind(name)
                .bind(pos as i64)
                .execute(&pool)
                .await
                .expect("Failed to seed subboard column");
            }

            new_id
        }
    };

    get_board(
        axum::extract::Path(board_id),
        axum::extract::State(pool),
    )
    .await
}

async fn get_company(
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> Result<axum::Json<Company>, axum::http::StatusCode> {
    let company: Option<Company> = sqlx::query_as("SELECT id, name FROM companies WHERE id = 1")
        .fetch_optional(&pool)
        .await
        .expect("Failed to fetch company");

    match company {
        Some(c) => Ok(axum::Json(c)),
        None => Err(axum::http::StatusCode::NOT_FOUND),
    }
}
