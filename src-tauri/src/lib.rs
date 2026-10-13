use std::io::Read;
use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicU16, AtomicU64, Ordering};
use std::sync::mpsc::{channel, Sender};
use std::sync::{LazyLock, Mutex};
use std::time::Duration;

use tauri::{AppHandle, Emitter};
use tiny_http::{Header, Method, Request, Response, Server};

const DEFAULT_PORT: u16 = 47800;
const FALLBACK_PORTS: std::ops::RangeInclusive<u16> = 47801..=47810;
const RESPONSE_TIMEOUT: Duration = Duration::from_secs(120);

/// Pending MCP requests waiting on the webview, keyed by request id.
static PENDING: LazyLock<Mutex<HashMap<String, Sender<Option<String>>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static PORT: AtomicU16 = AtomicU16::new(0);
static NEXT_ID: AtomicU64 = AtomicU64::new(1);

// ---- MCP relay server -------------------------------------------------------

/// Binds 127.0.0.1 on LUCENT_MCP_PORT (or 47800), then 47801..=47810, and serves
/// each request on its own thread.
fn start_mcp_server(app: AppHandle) {
    let base = std::env::var("LUCENT_MCP_PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT);
    let candidates = std::iter::once(base).chain(FALLBACK_PORTS.filter(move |p| *p != base));

    let Some((server, port)) = candidates
        .into_iter()
        .find_map(|p| Server::http(("127.0.0.1", p)).ok().map(|s| (s, p)))
    else {
        eprintln!("lucent: MCP relay could not bind any port");
        return;
    };
    PORT.store(port, Ordering::SeqCst);
    eprintln!("lucent: MCP relay listening on http://127.0.0.1:{port}/mcp");

    std::thread::spawn(move || {
        for req in server.incoming_requests() {
            let app = app.clone();
            std::thread::spawn(move || handle(app, req, port));
        }
    });
}

fn json_header() -> Header {
    Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap()
}

/// Accepts requests without an Origin (CLI agents, the stdio bridge) or from the Tauri webview.
/// Any web page (including ones served from other localhost ports) is rejected, so a browser
/// tab can never drive the editor or read/write files through it.
fn origin_allowed(req: &Request) -> bool {
    let Some(origin) = req.headers().iter().find(|h| h.field.equiv("Origin")) else {
        return true;
    };
    let o = origin.value.as_str();
    o.starts_with("tauri://") || o == "http://tauri.localhost" || o == "https://tauri.localhost"
}

/// Largest accepted request body (images can be sent as data URLs).
const MAX_BODY: u64 = 64 * 1024 * 1024;

fn handle(app: AppHandle, mut req: Request, port: u16) {
    let path = req.url().split('?').next().unwrap_or("").to_string();
    let resp = match (req.method(), path.as_str()) {
        (Method::Post, "/mcp") => {
            if !origin_allowed(&req) {
                Response::from_string("Forbidden").with_status_code(403)
            } else {
                let mut body = String::new();
                match std::io::Read::take(req.as_reader(), MAX_BODY + 1).read_to_string(&mut body) {
                    Ok(n) if n as u64 > MAX_BODY => Response::from_string("Payload Too Large").with_status_code(413),
                    Ok(_) => relay(&app, body),
                    Err(_) => Response::from_string("Bad Request").with_status_code(400),
                }
            }
        }
        (Method::Get, "/mcp") => Response::from_string("Method Not Allowed").with_status_code(405),
        (Method::Delete, "/mcp") => Response::from_string("").with_status_code(200),
        (Method::Get, "/health") => {
            Response::from_string(format!(r#"{{"name":"lucent","ok":true,"port":{port}}}"#))
                .with_header(json_header())
        }
        _ => Response::from_string("Not Found").with_status_code(404),
    };
    let _ = req.respond(resp);
}

/// Forwards a JSON-RPC body to the webview and blocks until it answers or times out.
fn relay(app: &AppHandle, body: String) -> Response<std::io::Cursor<Vec<u8>>> {
    let id = format!("{}-{}", std::process::id(), NEXT_ID.fetch_add(1, Ordering::SeqCst));
    let (tx, rx) = channel();
    PENDING.lock().unwrap().insert(id.clone(), tx);

    let payload = serde_json::json!({ "id": id, "body": body });
    if app.emit_to("main", "mcp-request", payload).is_err() {
        PENDING.lock().unwrap().remove(&id);
        return Response::from_string("Webview unavailable").with_status_code(503);
    }

    match rx.recv_timeout(RESPONSE_TIMEOUT) {
        Ok(Some(out)) => Response::from_string(out).with_header(json_header()),
        Ok(None) => Response::from_string("").with_status_code(202),
        Err(_) => {
            PENDING.lock().unwrap().remove(&id);
            Response::from_string(
                r#"{"jsonrpc":"2.0","id":null,"error":{"code":-32000,"message":"Lucent app did not respond"}}"#,
            )
            .with_status_code(504)
            .with_header(json_header())
        }
    }
}

// ---- Commands ---------------------------------------------------------------

/// Delivers the webview's answer for a pending MCP request (None = notification, 202).
#[tauri::command]
fn mcp_respond(id: String, body: Option<String>) {
    if let Some(tx) = PENDING.lock().unwrap().remove(&id) {
        let _ = tx.send(body);
    }
}

/// Actual bound MCP port, or 0 if binding failed.
#[tauri::command]
fn mcp_port() -> u16 {
    PORT.load(Ordering::SeqCst)
}

/// Returns file bytes as a binary IPC response (ArrayBuffer in JS).
#[tauri::command]
fn read_file(path: String) -> Result<tauri::ipc::Response, String> {
    std::fs::read(&path)
        .map(tauri::ipc::Response::new)
        .map_err(|e| format!("{path}: {e}"))
}

fn write_bytes(path: &str, data: &[u8]) -> Result<(), String> {
    if let Some(parent) = Path::new(path).parent().filter(|p| !p.as_os_str().is_empty()) {
        std::fs::create_dir_all(parent).map_err(|e| format!("{path}: {e}"))?;
    }
    std::fs::write(path, data).map_err(|e| format!("{path}: {e}"))
}

/// Writes bytes sent as a JSON number array (Array.from(uint8)).
#[tauri::command]
fn write_file(path: String, data: Vec<u8>) -> Result<(), String> {
    write_bytes(&path, &data)
}

/// Fast path for large files: invoke('write_file_raw', uint8,
/// { headers: { path: encodeURIComponent(path) } }) sends the bytes as a raw body.
#[tauri::command]
fn write_file_raw(request: tauri::ipc::Request) -> Result<(), String> {
    let tauri::ipc::InvokeBody::Raw(data) = request.body() else {
        return Err("expected raw binary body".into());
    };
    let path = request
        .headers()
        .get("path")
        .and_then(|v| v.to_str().ok())
        .ok_or("missing path header")?;
    write_bytes(&percent_decode(path)?, data)
}

fn percent_decode(s: &str) -> Result<String, String> {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            let hex = std::str::from_utf8(&b[i + 1..i + 3]).map_err(|e| e.to_string())?;
            out.push(u8::from_str_radix(hex, 16).map_err(|e| e.to_string())?);
            i += 3;
        } else {
            out.push(b[i]);
            i += 1;
        }
    }
    String::from_utf8(out).map_err(|e| e.to_string())
}

/// CLI args (minus argv[0]) that are existing files, for "Open with".
#[tauri::command]
fn initial_files() -> Vec<String> {
    std::env::args().skip(1).filter(|a| Path::new(a).is_file()).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            start_mcp_server(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            mcp_respond,
            mcp_port,
            read_file,
            write_file,
            write_file_raw,
            initial_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lucent");
}
