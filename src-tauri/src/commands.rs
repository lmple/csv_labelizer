use crate::csv_engine;
use crate::state::{CsvMetadata, CsvState, RowData};
use serde::Deserialize;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct SearchFilter {
    pub column_index: usize,
    pub query: String,
    #[serde(default)]
    pub exact: bool,
}

#[derive(Debug, Deserialize)]
pub enum FilterLogic {
    #[serde(rename = "AND")]
    And,
    #[serde(rename = "OR")]
    Or,
}

#[tauri::command]
pub fn open_csv(
    path: String,
    state: State<Mutex<CsvState>>,
) -> Result<CsvMetadata, String> {
    let start_time = std::time::Instant::now();
    println!("open_csv command called with path: {}", path);

    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        println!("ERROR: File not found: {}", path);
        return Err(format!("File not found: {}", path));
    }

    println!("File exists, building offset index...");
    // Build offset index and detect delimiter
    let (offsets, delimiter, headers) = csv_engine::build_offset_index(&file_path)?;
    println!("Offset index built. Rows: {}, Delimiter: {:?}", offsets.len(), delimiter as char);

    // Memory profiling: verify offset index stays within budget (200 MB for offsets)
    csv_engine::verify_memory_budget(offsets.len(), 200);

    // Get CSV directory for resolving relative image paths
    let csv_dir = file_path
        .parent()
        .ok_or_else(|| "Could not determine CSV directory".to_string())?
        .to_path_buf();

    // Get file modification time
    let file_modified_time = std::fs::metadata(&file_path)
        .ok()
        .and_then(|m| m.modified().ok());

    // Detect image column
    let image_column = csv_engine::detect_image_column(&headers);

    // Detect class columns
    let class_columns = csv_engine::detect_class_columns(&headers);

    // Extract unique values for class columns
    let mut class_values = std::collections::HashMap::new();
    for &col_idx in &class_columns {
        let unique_vals =
            csv_engine::extract_unique_values(&file_path, &offsets, col_idx, delimiter)?;
        class_values.insert(col_idx, unique_vals);
    }

    let row_count = offsets.len();

    // Update state
    let mut csv_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    csv_state.file_path = Some(file_path);
    csv_state.csv_dir = Some(csv_dir.clone());
    csv_state.headers = headers.clone();
    csv_state.offsets = offsets;
    csv_state.row_count = row_count;
    csv_state.delimiter = delimiter;
    csv_state.image_column = image_column;
    csv_state.has_unsaved_changes = false;
    csv_state.class_columns = class_columns;
    csv_state.class_values = class_values;
    csv_state.file_modified_time = file_modified_time;

    let elapsed = start_time.elapsed();
    println!("✓ open_csv completed in {:.2}ms ({} rows)", elapsed.as_secs_f64() * 1000.0, row_count);

    // Return metadata
    Ok(CsvMetadata {
        headers,
        row_count,
        csv_dir: csv_dir.to_string_lossy().to_string(),
        image_column,
        delimiter: String::from_utf8(vec![delimiter])
            .unwrap_or_else(|_| "?".to_string()),
    })
}

#[tauri::command]
pub fn get_row(
    index: usize,
    state: State<Mutex<CsvState>>,
) -> Result<RowData, String> {
    let start_time = std::time::Instant::now();

    let csv_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if index >= csv_state.row_count {
        return Err(format!(
            "Row index {} out of bounds (total rows: {})",
            index, csv_state.row_count
        ));
    }

    let file_path = csv_state
        .file_path
        .as_ref()
        .ok_or_else(|| "No CSV file opened".to_string())?;

    let offset = csv_state.offsets[index];
    let delimiter = csv_state.delimiter;

    let fields = csv_engine::read_row_at_offset(file_path, offset, delimiter)?;

    let elapsed = start_time.elapsed();
    println!("✓ get_row(index={}) completed in {:.2}ms", index, elapsed.as_secs_f64() * 1000.0);

    Ok(RowData {
        fields,
        row_index: index,
    })
}

#[tauri::command]
pub fn get_csv_stats(
    state: State<Mutex<CsvState>>,
) -> Result<CsvMetadata, String> {
    let csv_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if csv_state.file_path.is_none() {
        return Err("No CSV file opened".to_string());
    }

    Ok(CsvMetadata {
        headers: csv_state.headers.clone(),
        row_count: csv_state.row_count,
        csv_dir: csv_state
            .csv_dir
            .as_ref()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default(),
        image_column: csv_state.image_column,
        delimiter: String::from_utf8(vec![csv_state.delimiter])
            .unwrap_or_else(|_| "?".to_string()),
    })
}

#[tauri::command]
pub fn save_row(
    index: usize,
    fields: Vec<String>,
    state: State<Mutex<CsvState>>,
) -> Result<(), String> {
    let start_time = std::time::Instant::now();

    let mut csv_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if index >= csv_state.row_count {
        return Err(format!(
            "Row index {} out of bounds (total rows: {})",
            index, csv_state.row_count
        ));
    }

    let file_path = csv_state
        .file_path
        .as_ref()
        .ok_or_else(|| "No CSV file opened".to_string())?
        .clone(); // Clone to avoid borrow checker issues

    // Check if file has been modified externally
    if let Some(stored_time) = csv_state.file_modified_time {
        if let Ok(metadata) = std::fs::metadata(&file_path) {
            if let Ok(current_time) = metadata.modified() {
                if current_time > stored_time {
                    return Err(
                        "File has been modified externally. Please reload the file or use force save."
                            .to_string()
                    );
                }
            }
        }
    }

    let offset = csv_state.offsets[index];
    let delimiter = csv_state.delimiter;

    // Write the row
    csv_engine::write_row_at_offset(&file_path, offset, &fields, delimiter, None)?;

    // Rebuild offset index after write (in case row length changed)
    let (new_offsets, _, _) = csv_engine::build_offset_index(&file_path)?;
    csv_state.offsets = new_offsets;

    // Update file modification time after successful save
    csv_state.file_modified_time = std::fs::metadata(&file_path)
        .ok()
        .and_then(|m| m.modified().ok());

    csv_state.has_unsaved_changes = false;

    let elapsed = start_time.elapsed();
    println!("✓ save_row(index={}) completed in {:.2}ms", index, elapsed.as_secs_f64() * 1000.0);

    Ok(())
}

#[tauri::command]
pub fn get_class_columns(
    state: State<Mutex<CsvState>>,
) -> Result<std::collections::HashMap<usize, Vec<String>>, String> {
    let csv_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(csv_state.class_values.clone())
}

#[tauri::command]
pub fn add_class_value(
    column_index: usize,
    new_value: String,
    state: State<Mutex<CsvState>>,
) -> Result<(), String> {
    let mut csv_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    // Validate column is a class column
    if !csv_state.class_columns.contains(&column_index) {
        return Err(format!("Column {} is not a class column", column_index));
    }

    // Add value if not already present
    if let Some(values) = csv_state.class_values.get_mut(&column_index) {
        if !values.contains(&new_value) {
            values.push(new_value.clone());
            values.sort();
        }
    }

    Ok(())
}

#[tauri::command]
pub fn set_image_column(
    column_index: usize,
    state: State<Mutex<CsvState>>,
) -> Result<(), String> {
    let mut csv_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if column_index >= csv_state.headers.len() {
        return Err(format!(
            "Column index {} out of bounds (total columns: {})",
            column_index,
            csv_state.headers.len()
        ));
    }

    csv_state.image_column = Some(column_index);
    Ok(())
}

#[tauri::command]
pub fn copy_and_save(
    source_path: String,
    dest_path: String,
    row_index: usize,
    fields: Vec<String>,
    _state: State<Mutex<CsvState>>,
) -> Result<(), String> {
    let start_time = std::time::Instant::now();

    // Copy the file
    let source = PathBuf::from(&source_path);
    let dest = PathBuf::from(&dest_path);

    std::fs::copy(&source, &dest)
        .map_err(|e| format!("Failed to copy file: {}", e))?;

    println!("File copied from {} to {}", source_path, dest_path);

    // Now save the row to the new file
    // First, rebuild the offset index for the new file
    let (offsets, delimiter, _) = csv_engine::build_offset_index(&dest)?;

    if row_index >= offsets.len() {
        return Err(format!(
            "Row index {} out of bounds (total rows: {})",
            row_index,
            offsets.len()
        ));
    }

    let offset = offsets[row_index];
    csv_engine::write_row_at_offset(&dest, offset, &fields, delimiter, None)?;

    let elapsed = start_time.elapsed();
    println!("✓ copy_and_save completed in {:.2}ms", elapsed.as_secs_f64() * 1000.0);

    Ok(())
}

#[tauri::command]
pub fn search_rows(
    query: String,
    column_index: Option<usize>,
    state: State<Mutex<CsvState>>,
) -> Result<Vec<usize>, String> {
    let start_time = std::time::Instant::now();

    let csv_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if query.is_empty() {
        return Ok(Vec::new());
    }

    let file_path = csv_state
        .file_path
        .as_ref()
        .ok_or_else(|| "No CSV file opened".to_string())?;

    let delimiter = csv_state.delimiter;
    let query_lower = query.to_lowercase();
    let mut matching_indices = Vec::new();

    // Search through all rows
    for (row_idx, &offset) in csv_state.offsets.iter().enumerate() {
        let fields = csv_engine::read_row_at_offset(file_path, offset, delimiter)?;

        // Check if query matches
        let matches = if let Some(col_idx) = column_index {
            // Search specific column
            if col_idx < fields.len() {
                fields[col_idx].to_lowercase().contains(&query_lower)
            } else {
                false
            }
        } else {
            // Search all columns
            fields
                .iter()
                .any(|field| field.to_lowercase().contains(&query_lower))
        };

        if matches {
            matching_indices.push(row_idx);
        }
    }

    let elapsed = start_time.elapsed();
    println!(
        "✓ search_rows found {} matches in {:.2}ms",
        matching_indices.len(),
        elapsed.as_secs_f64() * 1000.0
    );

    Ok(matching_indices)
}

#[tauri::command]
pub fn advanced_search_rows(
    filters: Vec<SearchFilter>,
    logic: FilterLogic,
    state: State<Mutex<CsvState>>,
) -> Result<Vec<usize>, String> {
    let start_time = std::time::Instant::now();

    let csv_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    let file_path = csv_state
        .file_path
        .as_ref()
        .ok_or_else(|| "No CSV file opened".to_string())?;

    let delimiter = csv_state.delimiter;

    let matching_indices = execute_advanced_search(
        file_path, &csv_state.offsets, delimiter, &filters, &logic,
    )?;

    let elapsed = start_time.elapsed();
    println!(
        "✓ advanced_search_rows ({:?}) found {} matches in {:.2}ms",
        logic,
        matching_indices.len(),
        elapsed.as_secs_f64() * 1000.0
    );

    Ok(matching_indices)
}

/// Core search logic extracted for testability
fn execute_advanced_search(
    file_path: &std::path::Path,
    offsets: &[u64],
    delimiter: u8,
    filters: &[SearchFilter],
    logic: &FilterLogic,
) -> Result<Vec<usize>, String> {
    // Filter out empty queries
    let active_filters: Vec<&SearchFilter> = filters
        .iter()
        .filter(|f| !f.query.trim().is_empty())
        .collect();

    if active_filters.is_empty() {
        return Ok(Vec::new());
    }

    // Pre-process queries: lowercase and store exact flag
    let prepared_queries: Vec<(usize, String, bool)> = active_filters
        .iter()
        .map(|f| (f.column_index, f.query.trim().to_lowercase(), f.exact))
        .collect();

    let mut matching_indices = Vec::new();

    for (row_idx, &offset) in offsets.iter().enumerate() {
        let fields = csv_engine::read_row_at_offset(file_path, offset, delimiter)?;

        let field_matches = |col_idx: &usize, query_lower: &str, exact: &bool| -> bool {
            if *col_idx < fields.len() {
                if *exact {
                    fields[*col_idx].trim().to_lowercase() == *query_lower
                } else {
                    fields[*col_idx].to_lowercase().contains(query_lower)
                }
            } else {
                false
            }
        };

        let row_matches = match logic {
            FilterLogic::And => prepared_queries.iter().all(|(col_idx, query_lower, exact)| {
                field_matches(col_idx, query_lower, exact)
            }),
            FilterLogic::Or => prepared_queries.iter().any(|(col_idx, query_lower, exact)| {
                field_matches(col_idx, query_lower, exact)
            }),
        };

        if row_matches {
            matching_indices.push(row_idx);
        }
    }

    Ok(matching_indices)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn create_test_csv(content: &str) -> (tempfile::NamedTempFile, Vec<u64>, u8) {
        let mut file = tempfile::NamedTempFile::new().unwrap();
        write!(file, "{}", content).unwrap();
        file.flush().unwrap();

        let (offsets, delimiter, _headers) =
            csv_engine::build_offset_index(file.path()).unwrap();
        (file, offsets, delimiter)
    }

    #[test]
    fn test_and_logic_two_filters() {
        let csv = "Animal,Scene,Label\nCat,Indoor,good\nDog,Outdoor,bad\nCat,Outdoor,ok\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "Cat".into(), exact: false },
            SearchFilter { column_index: 1, query: "Indoor".into(), exact: false },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::And).unwrap();
        assert_eq!(result, vec![0]); // Only row 0: Cat,Indoor
    }

    #[test]
    fn test_or_logic_two_filters() {
        let csv = "Animal,Scene,Label\nCat,Indoor,good\nDog,Outdoor,bad\nBird,Indoor,ok\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "Cat".into(), exact: false },
            SearchFilter { column_index: 0, query: "Dog".into(), exact: false },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::Or).unwrap();
        assert_eq!(result, vec![0, 1]); // Cat and Dog rows
    }

    #[test]
    fn test_empty_filters_ignored() {
        let csv = "Animal,Scene\nCat,Indoor\nDog,Outdoor\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "Cat".into(), exact: false },
            SearchFilter { column_index: 1, query: "".into(), exact: false },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::And).unwrap();
        assert_eq!(result, vec![0]); // Empty filter ignored, only Cat filter applied
    }

    #[test]
    fn test_all_empty_returns_empty() {
        let csv = "Animal,Scene\nCat,Indoor\nDog,Outdoor\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "".into(), exact: false },
            SearchFilter { column_index: 1, query: "  ".into(), exact: false },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::And).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_no_duplicate_rows_in_or() {
        let csv = "Animal,Scene\nCat,Indoor\nDog,Outdoor\n";
        let (file, offsets, delim) = create_test_csv(csv);

        // Both filters match row 0
        let filters = vec![
            SearchFilter { column_index: 0, query: "Cat".into(), exact: false },
            SearchFilter { column_index: 1, query: "Indoor".into(), exact: false },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::Or).unwrap();
        // Row 0 matches both but should appear only once
        assert_eq!(result, vec![0]);
    }

    #[test]
    fn test_case_insensitive() {
        let csv = "Animal,Scene\nCat,Indoor\nDOG,OUTDOOR\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "dog".into(), exact: false },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::And).unwrap();
        assert_eq!(result, vec![1]);
    }

    #[test]
    fn test_substring_matching() {
        let csv = "Name,City\nAlbert,New York\nAlice,London\nBob,Albany\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "Al".into(), exact: false },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::And).unwrap();
        assert_eq!(result, vec![0, 1]); // Albert and Alice
    }

    #[test]
    fn test_and_no_matches() {
        let csv = "Animal,Scene\nCat,Indoor\nDog,Outdoor\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "Cat".into(), exact: false },
            SearchFilter { column_index: 1, query: "Outdoor".into(), exact: false },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::And).unwrap();
        assert!(result.is_empty()); // No row has Cat AND Outdoor
    }

    #[test]
    fn test_exact_match_single_filter() {
        let csv = "Animal,Scene\nCat,Indoor\nCatfish,Outdoor\nmy cat,Park\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "Cat".into(), exact: true },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::And).unwrap();
        assert_eq!(result, vec![0]); // Only "Cat", not "Catfish" or "my cat"
    }

    #[test]
    fn test_exact_match_case_insensitive() {
        let csv = "Animal,Scene\ncat,Indoor\nCAT,Outdoor\nCat,Park\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "Cat".into(), exact: true },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::And).unwrap();
        assert_eq!(result, vec![0, 1, 2]); // All three match case-insensitively
    }

    #[test]
    fn test_exact_match_whitespace_trimmed() {
        let csv = "Animal,Scene\n cat ,Indoor\n  Cat  ,Outdoor\nCat,Park\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "cat".into(), exact: true },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::And).unwrap();
        assert_eq!(result, vec![0, 1, 2]); // All match after trimming
    }

    #[test]
    fn test_exact_false_is_substring() {
        let csv = "Animal,Scene\nCatfish,Indoor\nCat,Outdoor\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "Cat".into(), exact: false },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::And).unwrap();
        assert_eq!(result, vec![0, 1]); // Both match via substring
    }

    #[test]
    fn test_exact_match_empty_query_ignored() {
        let csv = "Animal,Scene\nCat,Indoor\nDog,Outdoor\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "".into(), exact: true },
            SearchFilter { column_index: 1, query: "Indoor".into(), exact: false },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::And).unwrap();
        assert_eq!(result, vec![0]); // Empty exact filter ignored, only Indoor filter applied
    }

    #[test]
    fn test_mixed_exact_and_substring_and_logic() {
        let csv = "Status,Notes\nActive,needs review\nActive,done\nActivated,needs review\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "Active".into(), exact: true },
            SearchFilter { column_index: 1, query: "review".into(), exact: false },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::And).unwrap();
        assert_eq!(result, vec![0]); // Only row 0: Status exactly "Active" AND Notes contains "review"
    }

    #[test]
    fn test_mixed_exact_and_substring_or_logic() {
        let csv = "Status,Notes\nDone,needs review\nPending,done\nPending review,notes\n";
        let (file, offsets, delim) = create_test_csv(csv);

        let filters = vec![
            SearchFilter { column_index: 0, query: "Done".into(), exact: true },
            SearchFilter { column_index: 0, query: "Pend".into(), exact: false },
        ];
        let result = execute_advanced_search(file.path(), &offsets, delim, &filters, &FilterLogic::Or).unwrap();
        assert_eq!(result, vec![0, 1, 2]); // Row 0: exact "Done", Rows 1-2: contain "Pend"
    }
}
