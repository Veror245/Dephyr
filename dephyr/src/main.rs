use dephyr::{analysis, parser, scanner, walker};
use std::path::Path;

fn main() {
    println!("Hello, world!");

    let path = "test.py";

    let mut tree = parser::parse_python(path).unwrap();
    let queries = analysis::Queries::default();

    let path = Path::new("/mnt/shared/projects/Autonomous-Incident-Response-System/");

    // let files = walker::walk_dir(path);
    // println!("{:?}", files);

    scanner::scan(path, "numpy");
}
