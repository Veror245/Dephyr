use std::path::{Path, PathBuf};
use toml::Value;

#[derive(Debug, Clone)]
pub struct DependencyInfo {
    pub declared: bool,
    pub version: Option<String>,
    pub source: Option<String>, // "requirements.txt" | "pyproject.toml"
}

pub fn dependency_info(repo: &Path, package: &str) -> DependencyInfo {
    let target = normalize(package);

    // requirements*.txt at repo root
    for req in find_requirements_files(repo) {
        if let Ok(text) = std::fs::read_to_string(&req)
            && let Some(version) = requirements_lookup(&text, &target)
        {
            return DependencyInfo {
                declared: true,
                version,
                source: Some(req.file_name().unwrap().to_string_lossy().into_owned()),
            };
        }
    }

    // pyproject.toml
    let pyproject = repo.join("pyproject.toml");
    if pyproject.is_file() {
        if let Ok(text) = std::fs::read_to_string(&pyproject)
            && let Some(version) = pyproject_lookup(&text, &target)
        {
            return DependencyInfo {
                declared: true,
                version,
                source: Some("pyproject.toml".into()),
            };
        }
    }

    DependencyInfo {
        declared: false,
        version: None,
        source: None,
    }
}

/// PEP 503: lowercase, collapse runs of - _ . into a single -.
pub fn normalize(name: &str) -> String {
    let lower = name.to_ascii_lowercase();
    let mut out = String::with_capacity(lower.len());
    let mut prev_sep = false;
    for c in lower.chars() {
        if c == '-' || c == '_' || c == '.' {
            if !prev_sep {
                out.push('-');
                prev_sep = true;
            }
        } else {
            out.push(c);
            prev_sep = false;
        }
    }
    out.trim_matches('-').to_string()
}

fn find_requirements_files(repo: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    if let Ok(entries) = std::fs::read_dir(repo) {
        for e in entries.flatten() {
            let p = e.path();
            if !p.is_file() {
                continue;
            }
            if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                if name.starts_with("requirements") && name.ends_with(".txt") {
                    out.push(p);
                }
            }
        }
    }
    out
}

/// Returns Some(version) if package is found. Version is the RHS of == if pinned,
/// otherwise None (constraint like >=2.0 isn't a resolved version).
pub fn requirements_lookup(text: &str, target: &str) -> Option<Option<String>> {
    for raw in text.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        // strip inline comments
        let line = line.split('#').next().unwrap().trim();

        // name stops at first of: [ < > = ! ~ ; @ space tab
        let name: String = line
            .chars()
            .take_while(|c| {
                !matches!(
                    c,
                    '[' | '<' | '>' | '=' | '!' | '~' | ';' | '@' | ' ' | '\t'
                )
            })
            .collect();

        if name.is_empty() || normalize(&name) != target {
            continue;
        }

        // extract "==X" if present
        let version = line
            .split("==")
            .nth(1)
            .map(|v| {
                v.split(|c: char| matches!(c, ',' | ';' | ' ' | '\t'))
                    .next()
                    .unwrap_or("")
                    .to_string()
            })
            .filter(|s| !s.is_empty());

        return Some(version);
    }
    None
}

/// Returns Some(version) if declared. Version from PEP 621 is a constraint spec,
/// not resolved; from Poetry it may be a caret/tilde range. Both returned as-is.
fn pyproject_lookup(text: &str, target: &str) -> Option<Option<String>> {
    // eprintln!(
    //     "len={} bytes={:?}",
    //     text.len(),
    //     &text.as_bytes().iter().take(20).collect::<Vec<_>>()
    // );
    let doc: Value = match toml::from_str(text) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("TOML parse error: {e}");
            return None;
        }
    };
    // eprintln!(
    //     "parsed keys: {:?}",
    //     doc.as_table().map(|t| t.keys().collect::<Vec<_>>())
    // );

    // PEP 621: [project] dependencies = ["requests>=2.31", "flask"]
    if let Some(arr) = doc
        .get("project")
        .and_then(|p| p.get("dependencies"))
        .and_then(|d| d.as_array())
    {
        for entry in arr {
            let Some(s) = entry.as_str() else { continue };
            let name: String = s
                .chars()
                .take_while(|c| {
                    !matches!(
                        c,
                        '<' | '>' | '=' | '!' | '~' | ';' | '[' | '@' | ' ' | '\t'
                    )
                })
                .collect();
            if name.is_empty() || normalize(&name) != target {
                continue;
            }

            let version = s
                .split("==")
                .nth(1)
                .map(|v| {
                    v.split(|c: char| matches!(c, ',' | ';' | ' ' | '\t'))
                        .next()
                        .unwrap_or("")
                        .to_string()
                })
                .filter(|s| !s.is_empty());
            return Some(version);
        }
    }

    // Poetry: [tool.poetry.dependencies] <name> = "^2.31" or { version = "..." }
    if let Some(tbl) = doc
        .get("tool")
        .and_then(|t| t.get("poetry"))
        .and_then(|p| p.get("dependencies"))
        .and_then(|d| d.as_table())
    {
        for (key, val) in tbl {
            if normalize(key) != target {
                continue;
            }
            let version = val.as_str().map(String::from).or_else(|| {
                val.get("version")
                    .and_then(|v| v.as_str())
                    .map(String::from)
            });
            return Some(version);
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn req_pinned() {
        assert_eq!(
            requirements_lookup("requests==2.31.0\n", "requests"),
            Some(Some("2.31.0".into()))
        );
    }

    #[test]
    fn req_unpinned() {
        assert_eq!(
            requirements_lookup("requests>=2.0\n", "requests"),
            Some(None)
        );
    }

    #[test]
    fn req_alias_normalization() {
        assert_eq!(
            requirements_lookup("Flask_Cors==4.0\n", "flask-cors"),
            Some(Some("4.0".into()))
        );
    }

    #[test]
    fn req_no_false_positive() {
        assert_eq!(
            requirements_lookup("requests-mock==1.0\n", "requests"),
            None
        );
    }

    #[test]
    fn pyproject_pep621() {
        let t = r#"
[project]
dependencies = ["requests>=2.31", "flask==3.0"]
"#;
        assert_eq!(pyproject_lookup(t, "flask"), Some(Some("3.0".into())));
    }

    #[test]
    fn pyproject_poetry() {
        let t = r#"
[tool.poetry.dependencies]
requests = "^2.31"
flask = { version = "3.0.1", extras = ["async"] }
"#;
        assert_eq!(pyproject_lookup(t, "flask"), Some(Some("3.0.1".into())));
    }
}
