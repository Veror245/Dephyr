use dephyr::{analysis, deps, parser, scanner, walker};
use std::path::Path;

#[tokio::main]
async fn main() {
    // let path = "test.py";

    // let mut tree = parser::parse_python(path).unwrap();
    // let queries = analysis::Queries::default();

    let path = Path::new("/mnt/shared/projects/Autonomous-Incident-Response-System/");
    let dep = deps::dependency_info(path, "dotenv");

    println!("{:?}", dep);

    let files = walker::walk_dir(path);
    println!("{:?}", files);

    scanner::scan(path, "requests");

    let app = dephyr::api::router();

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    println!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
