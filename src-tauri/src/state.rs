use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Global state for the CSV editor application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CsvState {
    /// Path to the currently opened CSV file
    pub file_path: Option<PathBuf>,

    /// Directory containing the CSV file (used for resolving relative image paths)
    pub csv_dir: Option<PathBuf>,

    /// Column headers extracted from the first row
    pub headers: Vec<String>,

    /// Byte offsets for each row in the file (for efficient random access)
    pub offsets: Vec<u64>,

    /// Total number of data rows (excluding header)
    pub row_count: usize,

    /// Index of the column containing image paths (auto-detected or user-set)
    pub image_column: Option<usize>,

    /// Delimiter character detected or specified
    pub delimiter: u8,

    /// Flag indicating whether there are unsaved changes
    pub has_unsaved_changes: bool,

    /// Indices of columns containing "CLASS" in their name (case-insensitive)
    pub class_columns: Vec<usize>,

    /// Map of class column indices to their unique values
    pub class_values: std::collections::HashMap<usize, Vec<String>>,
}

impl Default for CsvState {
    fn default() -> Self {
        Self {
            file_path: None,
            csv_dir: None,
            headers: Vec::new(),
            offsets: Vec::new(),
            row_count: 0,
            image_column: None,
            delimiter: b',',
            has_unsaved_changes: false,
            class_columns: Vec::new(),
            class_values: std::collections::HashMap::new(),
        }
    }
}

/// Metadata returned when opening a CSV file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CsvMetadata {
    pub headers: Vec<String>,
    pub row_count: usize,
    pub csv_dir: String,
    pub image_column: Option<usize>,
    pub delimiter: String,
}

/// Data for a single row
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RowData {
    pub fields: Vec<String>,
    pub row_index: usize,
}
