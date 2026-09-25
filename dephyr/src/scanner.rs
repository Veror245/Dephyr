use crate::{
    analysis,
    analysis::{CallFinding, ImportFinding},
    parser, walker,
};
use std::path::{Path, PathBuf};

pub struct ScanRes {
    file: String,
    imports: Vec<ImportFinding>,
    calls: Vec<CallFinding>,
}

pub fn scan(path: &Path, import: &str) -> Vec<ScanRes> {
    let res: Vec<ScanRes> = Vec::new();
    let files = walker::walk_dir(path);

    for src in &files {
        let src = src.to_string_lossy().to_string();
        let tree = parser::parse_python(&src).unwrap();

        println!("{}", src);
    }

    // println!("{:#?}", files);

    res
}
