use axum::{Router, extract::Json, response::Json as JsonResponse, routing::post};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::scanner::{ScanRes, scan};

#[derive(Deserialize)]
pub struct ScanReq {
    pub repo: PathBuf,
    pub package: String,
    pub version: String,
}

#[derive(Serialize)]
pub struct Resp {
    pub res: Vec<ScanRes>,
}

pub fn router() -> Router {
    Router::new().route("/scan", post(scan_handler))
}

async fn scan_handler(Json(req): Json<ScanReq>) -> Json<Resp> {
    let result = tokio::task::spawn_blocking(move || scan(&req.repo, &req.package))
        .await
        .expect("scan task panicked");

    Json(Resp { res: result })
}
