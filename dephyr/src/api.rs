use axum::{Router, extract::Json, response::Json as JsonResponse, routing::post};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::scanner::{ScanRes, scan};
use tower_http::cors::{Any, CorsLayer};

#[derive(Deserialize)]
pub struct ScanReq {
    pub repo: PathBuf,
    pub package: String,
    pub version: String,
}

#[derive(Serialize)]
pub struct Resp {
    pub res: Vec<ScanRes>,
    pub total_function_call: usize,
}

pub fn router() -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new().route("/scan", post(scan_handler)).layer(cors)
}

async fn scan_handler(Json(req): Json<ScanReq>) -> Json<Resp> {
    let result = tokio::task::spawn_blocking(move || scan(&req.repo, &req.package))
        .await
        .expect("scan task panicked");

    let total_function_call = result.iter().map(|r| r.total_calls).sum();

    Json(Resp {
        res: result,
        total_function_call,
    })
}
