use crate::csv_engine;
use crate::state::{CsvMetadata, CsvState, RowData};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn open_csv(
    path: String,
    state: State<Mutex<CsvState>>,
) -> Result<CsvMetadata, String> {
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

    // Get CSV directory for resolving relative image paths
    let csv_dir = file_path
        .parent()
        .ok_or_else(|| "Could not determine CSV directory".to_string())?
        .to_path_buf();

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
        .ok_or_else(|| "No CSV file opened".to_string())?;

    let offset = csv_state.offsets[index];
    let delimiter = csv_state.delimiter;

    // Write the row
    csv_engine::write_row_at_offset(file_path, offset, &fields, delimiter, None)?;

    // Rebuild offset index after write (in case row length changed)
    let (new_offsets, _, _) = csv_engine::build_offset_index(file_path)?;
    csv_state.offsets = new_offsets;

    csv_state.has_unsaved_changes = false;

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
