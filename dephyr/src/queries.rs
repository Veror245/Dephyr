pub const PY_IMPORTS: &str = r#"
(import_statement 
name: (dotted_name) @import.name)

(import_from_statement
module_name: (dotted_name) @from.module_name 
name: (dotted_name) @import.name)

(import_statement
name: (aliased_import
name: (dotted_name) @import.name
alias: (identifier) @import.alias)) @kind.alias


(import_from_statement
module_name: (dotted_name) @from.module_name
name: (aliased_import
name: (dotted_name) @import.name
alias: (identifier) @import.alias)) @from.alias

(import_from_statement
module_name: (dotted_name) @from.module_name
(wildcard_import) @wildcard
) @kind.wildcard
"#;

pub const PY_CALLS: &str = r#"

(call 
function: (identifier) @call.function
arguments: (argument_list) @call.arguments) @kind.plain

(call
function: (attribute
object: (identifier) @call.function
attribute: (identifier) @call.attribute)
arguments: (argument_list) @call.arguments) @kind.keyword


"#;
