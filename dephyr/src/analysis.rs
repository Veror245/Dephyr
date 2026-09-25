use crate::queries;
use tree_sitter::{Language, Query, QueryCursor, StreamingIterator, Tree};

pub struct Queries {
    pub imports: Query,
    pub calls: Query,
}

impl Default for Queries {
    fn default() -> Self {
        let lang: Language = tree_sitter_python::LANGUAGE.into();

        Self {
            imports: Query::new(&lang, queries::PY_IMPORTS).unwrap(),
            calls: Query::new(&lang, queries::PY_CALLS).unwrap(),
        }
    }
}

#[derive(Debug, PartialEq, Clone, serde::Serialize)]
pub struct ImportFinding {
    pub module: String,
    pub name: Option<String>,
    pub alias: Option<String>,
    pub start: usize,
    pub end: usize,
}

impl ImportFinding {
    fn new(text: String) -> Self {
        Self {
            module: text,
            name: None,
            alias: None,
            start: 0,
            end: 0,
        }
    }
}

#[derive(Debug, PartialEq, Default, Clone, serde::Serialize)]
pub struct CallFinding {
    pub function: String,
    pub attribute: Option<String>,
    pub args: Option<String>,
    pub start: usize,
    pub end: usize,
}

pub fn find_imports(tree: &Tree, src: &str, query: &Query) -> Vec<ImportFinding> {
    let mut out = Vec::new();
    let mut cursor = QueryCursor::new();
    let mut matches = cursor.matches(query, tree.root_node(), src.as_bytes());

    while let Some(m) = matches.next() {
        let mut captures = m.captures().iter();
        while let Some(caps) = captures.next() {
            let cap_name = query.capture_names()[caps.index as usize];
            let text = src[caps.node.byte_range()].to_string();
            match cap_name {
                "import.name" => {
                    let mut impf = ImportFinding::new(text.clone());
                    let start = caps.node.start_position().row + 1;
                    let end = caps.node.end_position().row + 1;
                    impf.start = start;
                    impf.end = end;
                    out.push(impf);
                }
                "from.module_name" => {
                    let mut impf = ImportFinding::new(text.clone());
                    impf.start = caps.node.start_position().row + 1;
                    impf.end = caps.node.end_position().row + 1;
                    if let Some(name) = captures.next() {
                        impf.name = Some(src[name.node.byte_range()].to_string());
                    }
                    out.push(impf);
                }
                "kind.alias" => {
                    let mut impf = ImportFinding::new(String::from("hi"));
                    impf.start = caps.node.start_position().row + 1;
                    impf.end = caps.node.end_position().row + 1;

                    if let Some(name) = captures.next() {
                        let text = src[name.node.byte_range()].to_string();
                        impf.module = text;
                    }
                    if let Some(alias) = captures.next() {
                        impf.alias = Some(src[alias.node.byte_range()].to_string());
                    }
                    out.push(impf);
                }
                "from.alias" => {
                    let mut impf = ImportFinding::new(String::from("hi"));
                    impf.start = caps.node.start_position().row + 1;
                    impf.end = caps.node.end_position().row + 1;
                    if let Some(name) = captures.next() {
                        let text = src[name.node.byte_range()].to_string();
                        impf.module = text;
                    }
                    if let Some(name) = captures.next() {
                        impf.name = Some(src[name.node.byte_range()].to_string());
                    }
                    if let Some(alias) = captures.next() {
                        impf.alias = Some(src[alias.node.byte_range()].to_string());
                    }
                    out.push(impf);
                }
                _ => {}
            } //TODO:add a few more import patterns

            // println!("{}, {}", cap_name, text);
            // println!("{:?}", out);
        }
    }

    out
}

pub fn find_calls(tree: &Tree, src: &str, query: &Query) -> Vec<CallFinding> {
    let mut out = Vec::new();
    let mut cursor = QueryCursor::new();
    let mut matches = cursor.matches(query, tree.root_node(), src.as_bytes());

    while let Some(m) = matches.next() {
        let mut captures = m.captures().iter();
        while let Some(caps) = captures.next() {
            let cap_name = query.capture_names()[caps.index as usize];

            let mut cf = CallFinding::default();

            match cap_name {
                "kind.plain" => {
                    if let Some(func) = captures.next() {
                        cf.function = src[func.node.byte_range()].to_string();
                        cf.start = func.node.start_position().row + 1;
                        cf.end = func.node.end_position().row + 1;
                    }
                    if let Some(args) = captures.next()
                        && &src[args.node.byte_range()] != "()"
                    {
                        cf.args = Some(src[args.node.byte_range()].to_string());
                        cf.end = args.node.end_position().row + 1;
                    }

                    out.push(cf);
                }

                "kind.keyword" => {
                    if let Some(func) = captures.next() {
                        cf.function = src[func.node.byte_range()].to_string();
                        cf.start = func.node.start_position().row + 1;
                        cf.end = func.node.end_position().row + 1;
                    }
                    if let Some(func) = captures.next() {
                        cf.attribute = Some(src[func.node.byte_range()].to_string());
                        cf.end = func.node.end_position().row + 1;
                    }

                    if let Some(args) = captures.next()
                        && &src[args.node.byte_range()] != "()"
                    {
                        cf.args = Some(src[args.node.byte_range()].to_string());
                        cf.end = args.node.end_position().row + 1;
                    }

                    out.push(cf);
                }
                _ => {}
            }

            // println!("cap: {}, text: {}", cap_name, text);
        }
    }

    out
}
