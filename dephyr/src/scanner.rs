use crate::{
    analysis,
    analysis::{CallFinding, ImportFinding, Queries},
    parser, queries, walker,
};
use std::path::{Path, PathBuf};

#[derive(Default)]
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
        let mut ress = ScanRes::default();
        let mut alias = String::new();

        let calls = analysis::find_calls(&tree, &src, &Queries::default().calls);
        let imports = analysis::find_imports(&tree, &src, &Queries::default().imports);

        // for imp in imports {
        //     if imp.module == import {
        //         alias = imp.clone().alias.unwrap();
        //         ress.file = src.clone();
        //         ress.imports.push(imp);
        //     }
        // }

        println!("{}", src);
    }

    // println!("{:#?}", files);

    res
}
