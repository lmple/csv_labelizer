/**
 * Metadata about the opened CSV file
 */
export interface CsvMetadata {
  /** Column headers from the first row */
  headers: string[];

  /** Total number of data rows (excluding header) */
  row_count: number;

  /** Directory containing the CSV file (for resolving relative image paths) */
  csv_dir: string;

  /** Index of the column containing image paths (null if not detected) */
  image_column: number | null;

  /** Delimiter character used in the CSV */
  delimiter: string;
}

/**
 * Data for a single row
 */
export interface RowData {
  /** Field values for this row */
  fields: string[];

  /** Zero-based index of this row */
  row_index: number;
}

/**
 * Map of class column indices to their unique values
 */
export type ClassValuesMap = Record<number, string[]>;
