use crate::{
    analysis,
    analysis::{CallFinding, ImportFinding, Queries},
    deps, parser, walker,
};
use std::fs::File;
use std::{io::Read, path::Path};

#[derive(Default, Debug, serde::Serialize)]
pub struct ScanRes {
    pub file: String,
    pub imports: Vec<ImportFinding>,
    pub total_imports: usize,
    pub calls: Vec<CallFinding>,
    pub total_calls: usize,
    pub exposure_level: u8,
}

// pub fn scan(path: &Path, import: &str) -> Vec<ScanRes> {
//     let mut res: Vec<ScanRes> = Vec::new();
//     let files = walker::walk_dir(path);
//     let depcheck = deps::dependency_info(path, import).declared;
//
//     let calls_q = Queries::default().calls;
//     let imp_q = Queries::default().imports;
//
//     if depcheck {
//         for src in &files {
//             let src = src.to_string_lossy().to_string();
//             let mut file = File::open(src.clone()).expect("Invalid Path");
//             let mut scode = String::new();
//
//             file.read_to_string(&mut scode)
//                 .expect("Failure reading to file");
//
//             let tree = parser::parse_python(&src).unwrap();
//             let mut ress = ScanRes::default();
//             let mut alias: String = String::new();
//
//             let mut imp_used = false;
//
//             let calls = analysis::find_calls(&tree, &scode, &calls_q);
//             let imports = analysis::find_imports(&tree, &scode, &imp_q);
//
//             for imp in imports {
//                 // println!("{}", imp.module);
//                 if imp.module == import {
//                     imp_used = true;
//                     alias = imp.clone().alias.unwrap_or(String::from("None"));
//                     ress.file = src.clone();
//                     ress.imports.push(imp);
//                     // println!("{}", alias);
//                     // println!("{:#?}", ress);
//                 }
//             }
//             ress.total_imports = ress.imports.len();
//
//             for func in calls {
//                 if func.function == import || func.function == alias {
//                     ress.calls.push(func);
//                 }
//             }
//             ress.total_calls = ress.calls.len();
//             if imp_used {
//                 if ress.total_calls == 0 {
//                     ress.exposure_level = 1;
//                 } else {
//                     ress.exposure_level = 2;
//                 }
//                 res.push(ress);
//             }
//
//             // println!("{:#?}", res);
//         }
//     }
//
//     // println!("{:#?}", files);
//
//     res
// }

use rayon::prelude::*;

pub fn scan(path: &Path, import: &str) -> Vec<ScanRes> {
    if !deps::dependency_info(path, import).declared {
        return Vec::new();
    }

    // Compile queries ONCE, share read-only across threads.
    let queries = Queries::default();

    walker::walk_dir(path)
        .par_iter()
        .filter_map(|p| analyze_file(p, import, &queries))
        .collect()
}
//
fn analyze_file(path: &Path, import: &str, queries: &Queries) -> Option<ScanRes> {
    let src = path.to_string_lossy().to_string();
    let scode = std::fs::read_to_string(path).ok()?;
    let tree = parser::parse_python(&scode)?;

    let imports = analysis::find_imports(&tree, &scode, &queries.imports);
    let calls = analysis::find_calls(&tree, &scode, &queries.calls);

    let mut ress = ScanRes::default();
    let mut alias: Option<String> = None;
    let mut imported = false;

    for imp in imports {
        if imp.module == import {
            imported = true;
            alias = imp.alias.clone();
            ress.imports.push(imp);
        }
    }

    if !imported {
        return None; // don't emit files that don't import the target
    }

    for func in calls {
        if func.function == import || alias.as_deref() == Some(&func.function) {
            ress.calls.push(func);
        }
    }

    ress.file = src;
    ress.total_imports = ress.imports.len();
    ress.total_calls = ress.calls.len();
    ress.exposure_level = if ress.calls.is_empty() { 1 } else { 2 };

    Some(ress)
}
