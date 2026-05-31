use tower_http::cors::CorsLayer;

// --- Database row types ---

#[derive(serde::Serialize, sqlx::FromRow)]
struct Company {
    id: i64,
    name: String,
}

#[derive(serde::Serialize, sqlx::FromRow)]
struct Tag {
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
    start_date: Option<String>,
    due_date: Option<String>,
    position: i64,
}

// --- Request body types ---

#[derive(serde::Deserialize)]
struct CreateTag {
    name: String,
}

#[derive(serde::Deserialize)]
struct CreateTicket {
    column_id: i64,
    title: String,
    description: Option<String>,
    start_date: Option<String>,
    due_date: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateCompany {
    name: String,
}

#[derive(serde::Deserialize)]
struct UpdateTag {
    name: String,
}

#[derive(serde::Deserialize)]
struct UpdateTicket {
    column_id: Option<i64>,
    title: Option<String>,
    description: Option<String>,
    start_date: Option<String>,
    due_date: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateSwimlaneOrder {
    swimlane_orders: Vec<(i64, i64)>, // (tag_id, position)
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
    start_date: Option<String>,
    due_date: Option<String>,
    position: i64,
    tags: Vec<Tag>,
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
        .route("/tags", axum::routing::get(list_tags).post(create_tag))
        .route("/tags/:id", axum::routing::patch(rename_tag).delete(delete_tag))
        .route("/boards", axum::routing::get(list_boards))
        .route("/boards/:id", axum::routing::get(get_board))
        .route("/boards/:id/swimlanes", axum::routing::get(get_board_swimlanes))
        .route("/boards/:id/swimlanes/order", axum::routing::patch(update_swimlane_order))
        .route("/boards/:id/swimlanes/:tag_id", axum::routing::post(add_board_swimlane).delete(remove_board_swimlane))
        .route("/tickets", axum::routing::post(create_ticket))
        .route("/tickets/:id", axum::routing::patch(update_ticket).delete(delete_ticket))
        .route("/tickets/:id/tags/:tag_id", axum::routing::post(tag_ticket).delete(untag_ticket))
        .route("/tickets/:id/board", axum::routing::get(get_or_create_subboard))
        .route("/company", axum::routing::get(get_company).patch(update_company))
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
        "CREATE TABLE IF NOT EXISTS tags (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create tags table");

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
        "CREATE TABLE IF NOT EXISTS board_swimlanes (
            board_id INTEGER NOT NULL REFERENCES boards(id),
            tag_id   INTEGER NOT NULL REFERENCES tags(id),
            position INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (board_id, tag_id)
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create board_swimlanes table");

    // Add position column if it doesn't exist (for existing databases)
    let _ = sqlx::query("ALTER TABLE board_swimlanes ADD COLUMN position INTEGER NOT NULL DEFAULT 0")
        .execute(pool)
        .await;

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
            start_date  TEXT,
            due_date    TEXT,
            position    INTEGER NOT NULL DEFAULT 0
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create tickets table");

    // Add columns if they don't exist (for existing databases)
    let _ = sqlx::query("ALTER TABLE tickets ADD COLUMN start_date TEXT")
        .execute(pool)
        .await;
    let _ = sqlx::query("ALTER TABLE tickets ADD COLUMN due_date TEXT")
        .execute(pool)
        .await;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS ticket_tags (
            ticket_id INTEGER NOT NULL REFERENCES tickets(id),
            tag_id    INTEGER NOT NULL REFERENCES tags(id),
            PRIMARY KEY (ticket_id, tag_id)
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create ticket_tags table");

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

        for (pos, name) in ["Backlog", "To Do", "In Progress", "Done"].iter().enumerate() {
            sqlx::query("INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)")
                .bind(board_id)
                .bind(name)
                .bind(pos as i64)
                .execute(pool)
                .await
                .expect("Failed to seed column");
        }

        println!("Seeded: company, root board, and columns (Backlog / To Do / In Progress / Done)");
    }
}

// --- Handlers ---

async fn hello_handler() -> &'static str {
    "Hello from orga-tasker!"
}

async fn list_tags(
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> axum::Json<Vec<Tag>> {
    let tags: Vec<Tag> = sqlx::query_as("SELECT id, name FROM tags")
        .fetch_all(&pool)
        .await
        .expect("Failed to fetch tags");
    axum::Json(tags)
}

async fn create_tag(
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
    axum::Json(body): axum::Json<CreateTag>,
) -> (axum::http::StatusCode, axum::Json<Tag>) {
    let id: i64 = sqlx::query_scalar("INSERT INTO tags (name) VALUES (?) RETURNING id")
        .bind(&body.name)
        .fetch_one(&pool)
        .await
        .expect("Failed to insert tag");
    (axum::http::StatusCode::CREATED, axum::Json(Tag { id, name: body.name }))
}

async fn rename_tag(
    axum::extract::Path(tag_id): axum::extract::Path<i64>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
    axum::Json(body): axum::Json<UpdateTag>,
) -> axum::http::StatusCode {
    if body.name.trim().is_empty() {
        return axum::http::StatusCode::UNPROCESSABLE_ENTITY;
    }
    sqlx::query("UPDATE tags SET name = ? WHERE id = ?")
        .bind(&body.name)
        .bind(tag_id)
        .execute(&pool)
        .await
        .expect("Failed to rename tag");
    axum::http::StatusCode::NO_CONTENT
}

async fn delete_tag(
    axum::extract::Path(tag_id): axum::extract::Path<i64>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> axum::http::StatusCode {
    sqlx::query("DELETE FROM ticket_tags WHERE tag_id = ?")
        .bind(tag_id)
        .execute(&pool)
        .await
        .expect("Failed to remove ticket tags");
    sqlx::query("DELETE FROM board_swimlanes WHERE tag_id = ?")
        .bind(tag_id)
        .execute(&pool)
        .await
        .expect("Failed to remove swimlane entries");
    sqlx::query("DELETE FROM tags WHERE id = ?")
        .bind(tag_id)
        .execute(&pool)
        .await
        .expect("Failed to delete tag");
    axum::http::StatusCode::NO_CONTENT
}

async fn get_board_swimlanes(
    axum::extract::Path(board_id): axum::extract::Path<i64>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> axum::Json<Vec<Tag>> {
    let tags: Vec<Tag> = sqlx::query_as(
        "SELECT t.id, t.name FROM tags t
         JOIN board_swimlanes bs ON bs.tag_id = t.id
         WHERE bs.board_id = ?
         ORDER BY bs.position",
    )
    .bind(board_id)
    .fetch_all(&pool)
    .await
    .expect("Failed to fetch board swimlanes");
    axum::Json(tags)
}

async fn add_board_swimlane(
    axum::extract::Path((board_id, tag_id)): axum::extract::Path<(i64, i64)>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> axum::http::StatusCode {
    let position: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM board_swimlanes WHERE board_id = ?")
        .bind(board_id)
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    sqlx::query("INSERT OR IGNORE INTO board_swimlanes (board_id, tag_id, position) VALUES (?, ?, ?)")
        .bind(board_id)
        .bind(tag_id)
        .bind(position)
        .execute(&pool)
        .await
        .expect("Failed to add swimlane");
    axum::http::StatusCode::NO_CONTENT
}

async fn remove_board_swimlane(
    axum::extract::Path((board_id, tag_id)): axum::extract::Path<(i64, i64)>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> axum::http::StatusCode {
    sqlx::query("DELETE FROM board_swimlanes WHERE board_id = ? AND tag_id = ?")
        .bind(board_id)
        .bind(tag_id)
        .execute(&pool)
        .await
        .expect("Failed to remove swimlane");
    axum::http::StatusCode::NO_CONTENT
}

async fn update_swimlane_order(
    axum::extract::Path(board_id): axum::extract::Path<i64>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
    axum::Json(body): axum::Json<UpdateSwimlaneOrder>,
) -> axum::http::StatusCode {
    for (tag_id, position) in body.swimlane_orders {
        sqlx::query("UPDATE board_swimlanes SET position = ? WHERE board_id = ? AND tag_id = ?")
            .bind(position)
            .bind(board_id)
            .bind(tag_id)
            .execute(&pool)
            .await
            .expect("Failed to update swimlane order");
    }
    axum::http::StatusCode::NO_CONTENT
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
            "SELECT id, title, description, start_date, due_date, position
             FROM tickets WHERE column_id = ? ORDER BY position",
        )
        .bind(col.id)
        .fetch_all(&pool)
        .await
        .expect("Failed to fetch tickets");

        let mut tickets = Vec::new();
        for ticket in ticket_rows {
            let tags: Vec<Tag> = sqlx::query_as(
                "SELECT t.id, t.name FROM tags t
                 JOIN ticket_tags tt ON tt.tag_id = t.id
                 WHERE tt.ticket_id = ?",
            )
            .bind(ticket.id)
            .fetch_all(&pool)
            .await
            .expect("Failed to fetch ticket tags");

            tickets.push(TicketResponse {
                id: ticket.id,
                title: ticket.title,
                description: ticket.description,
                start_date: ticket.start_date,
                due_date: ticket.due_date,
                position: ticket.position,
                tags,
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
        "INSERT INTO tickets (column_id, title, description, start_date, due_date, position) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
    )
    .bind(body.column_id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.start_date)
    .bind(&body.due_date)
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
            start_date: body.start_date,
            due_date: body.due_date,
            position,
            tags: vec![],
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

    if let Some(ref start_date) = body.start_date {
        sqlx::query("UPDATE tickets SET start_date = ? WHERE id = ?")
            .bind(start_date)
            .bind(ticket_id)
            .execute(&pool)
            .await
            .expect("Failed to update ticket start_date");
    }

    if let Some(ref due_date) = body.due_date {
        sqlx::query("UPDATE tickets SET due_date = ? WHERE id = ?")
            .bind(due_date)
            .bind(ticket_id)
            .execute(&pool)
            .await
            .expect("Failed to update ticket due_date");
    }

    let ticket: Option<TicketRow> =
        sqlx::query_as("SELECT id, title, description, start_date, due_date, position FROM tickets WHERE id = ?")
            .bind(ticket_id)
            .fetch_optional(&pool)
            .await
            .expect("Failed to fetch updated ticket");

    let ticket = match ticket {
        Some(t) => t,
        None => return Err(axum::http::StatusCode::NOT_FOUND),
    };

    let tags: Vec<Tag> = sqlx::query_as(
        "SELECT t.id, t.name FROM tags t
         JOIN ticket_tags tt ON tt.tag_id = t.id
         WHERE tt.ticket_id = ?",
    )
    .bind(ticket_id)
    .fetch_all(&pool)
    .await
    .expect("Failed to fetch ticket tags");

    Ok(axum::Json(TicketResponse {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        start_date: ticket.start_date,
        due_date: ticket.due_date,
        position: ticket.position,
        tags,
    }))
}

async fn tag_ticket(
    axum::extract::Path((ticket_id, tag_id)): axum::extract::Path<(i64, i64)>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> axum::http::StatusCode {
    let result = sqlx::query(
        "INSERT OR IGNORE INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)",
    )
    .bind(ticket_id)
    .bind(tag_id)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => axum::http::StatusCode::NO_CONTENT,
        Err(e) => {
            eprintln!("tag_ticket failed (ticket={ticket_id}, tag={tag_id}): {e}");
            axum::http::StatusCode::UNPROCESSABLE_ENTITY
        }
    }
}

async fn untag_ticket(
    axum::extract::Path((ticket_id, tag_id)): axum::extract::Path<(i64, i64)>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> axum::http::StatusCode {
    sqlx::query("DELETE FROM ticket_tags WHERE ticket_id = ? AND tag_id = ?")
        .bind(ticket_id)
        .bind(tag_id)
        .execute(&pool)
        .await
        .expect("Failed to untag ticket");
    axum::http::StatusCode::NO_CONTENT
}

async fn delete_ticket(
    axum::extract::Path(ticket_id): axum::extract::Path<i64>,
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
) -> axum::http::StatusCode {
    sqlx::query("DELETE FROM ticket_tags WHERE ticket_id = ?")
        .bind(ticket_id)
        .execute(&pool)
        .await
        .expect("Failed to remove ticket tags");
    sqlx::query("DELETE FROM tickets WHERE id = ?")
        .bind(ticket_id)
        .execute(&pool)
        .await
        .expect("Failed to delete ticket");
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

            for (pos, name) in ["Backlog", "To Do", "In Progress", "Done"].iter().enumerate() {
                sqlx::query("INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)")
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

    get_board(axum::extract::Path(board_id), axum::extract::State(pool)).await
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

async fn update_company(
    axum::extract::State(pool): axum::extract::State<sqlx::SqlitePool>,
    axum::Json(body): axum::Json<UpdateCompany>,
) -> Result<axum::Json<Company>, axum::http::StatusCode> {
    if body.name.trim().is_empty() {
        return Err(axum::http::StatusCode::UNPROCESSABLE_ENTITY);
    }
    sqlx::query("UPDATE companies SET name = ? WHERE id = 1")
        .bind(&body.name)
        .execute(&pool)
        .await
        .expect("Failed to update company name");
    Ok(axum::Json(Company { id: 1, name: body.name }))
}
