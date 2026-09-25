use crate::{
    analysis,
    analysis::{CallFinding, ImportFinding, Queries},
    deps, parser, walker,
};
use std::fs::File;
use std::{io::Read, path::Path};

#[derive(Default, Debug, serde::Serialize)]
pub struct ScanRes {
    file: String,
    imports: Vec<ImportFinding>,
    calls: Vec<CallFinding>,
}

pub fn scan(path: &Path, import: &str) -> Vec<ScanRes> {
    let mut res: Vec<ScanRes> = Vec::new();
    let files = walker::walk_dir(path);
    let depcheck = deps::dependency_info(path, import).declared;

    if depcheck {
        for src in &files {
            let src = src.to_string_lossy().to_string();
            let mut file = File::open(src.clone()).expect("Invalid Path");
            let mut scode = String::new();

            file.read_to_string(&mut scode)
                .expect("Failure reading to file");

            let tree = parser::parse_python(&src).unwrap();
            let mut ress = ScanRes::default();
            let mut alias: String = String::new();

            let mut imp_used = false;

            let calls = analysis::find_calls(&tree, &scode, &Queries::default().calls);
            let imports = analysis::find_imports(&tree, &scode, &Queries::default().imports);

            for imp in imports {
                // println!("{}", imp.module);
                if imp.module == import {
                    imp_used = true;
                    alias = imp.clone().alias.unwrap_or(String::from("None"));
                    ress.file = src.clone();
                    ress.imports.push(imp);
                    println!("{}", alias);
                    println!("{:#?}", ress);
                }
            }

            for func in calls {
                if func.function == import || func.function == alias {
                    ress.calls.push(func);
                }
            }

            if imp_used {
                res.push(ress);
            }

            println!("{:#?}", res);
        }
    }

    // println!("{:#?}", files);

    res
}
