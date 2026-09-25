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
    total_imports: usize,
    calls: Vec<CallFinding>,
    total_calls: usize,
}

pub fn scan(path: &Path, import: &str) -> Vec<ScanRes> {
    let mut res: Vec<ScanRes> = Vec::new();
    let files = walker::walk_dir(path);
    let depcheck = deps::dependency_info(path, import).declared;

    let mut impc = 0;
    let mut callc = 0;

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
                    impc += 1;
                    imp_used = true;
                    alias = imp.clone().alias.unwrap_or(String::from("None"));
                    ress.file = src.clone();
                    ress.imports.push(imp);
                    println!("{}", alias);
                    println!("{:#?}", ress);
                }
            }
            ress.total_imports = impc;

            for func in calls {
                callc += 1;
                if func.function == import || func.function == alias {
                    ress.calls.push(func);
                }
            }
            ress.total_calls = callc;
            if imp_used {
                res.push(ress);
            }

            println!("{:#?}", res);
        }
    }

    // println!("{:#?}", files);

    res
}
