use std::{fs::File, io::Read};
use tree_sitter::{Node, Parser, Tree};

use crate::analysis::{self, Queries};

pub fn parse_python(scode: &str) -> Option<Tree> {
    let mut parser = Parser::new();

    parser
        .set_language(&tree_sitter_python::LANGUAGE.into())
        .expect("Error loading python grammar");

    // let mut file = File::open(path).expect("Wrong Path");
    // let mut scode = String::new();
    //
    // file.read_to_string(&mut scode).expect("File Non Existent");

    // println!("{}", scode);

    let tree = parser.parse(&scode, None);

    let calls = analysis::find_calls(tree.as_ref().unwrap(), &scode, &Queries::default().calls);
    let imports =
        analysis::find_imports(tree.as_ref().unwrap(), &scode, &Queries::default().imports);

    // for imp in imports {
    //     println!("{:?}", imp);
    // }
    // //
    // for call in calls {
    //     println!("{:?}", call);
    // }

    // if let Some(ast) = tree.as_ref() {
    //     let root = ast.root_node();
    //     print_tree(root, &scode, 0, None);
    // } else {
    //     println!("NO tree");
    // }

    tree
}

fn _print_tree(node: Node, src: &str, depth: usize, field: Option<&str>) {
    let indent = "  ".repeat(depth);
    let field_str = field.map(|f| format!(" (field: {f})")).unwrap_or_default();

    if node.child_count() == 0 {
        let snippet = &src[node.byte_range()];
        println!("{}{} {:?}{}", indent, node.kind(), snippet, field_str);
    } else {
        println!("{}{}{}", indent, node.kind(), field_str);
    }

    let mut cursor = node.walk();
    if cursor.goto_first_child() {
        loop {
            let child = cursor.node();
            let field = cursor.field_name();
            _print_tree(child, src, depth + 1, field);

            if !cursor.goto_next_sibling() {
                break;
            }
        }
    }
}
