use csv::WriterBuilder;
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom, Write};
use std::path::Path;

/// Detect encoding and strip BOM if present
/// Returns the starting offset (0 if no BOM, 3 if UTF-8 BOM)
fn detect_encoding_and_bom<R: Read + Seek>(reader: &mut R) -> Result<u64, String> {
    let mut bom = [0u8; 3];
    let bytes_read = reader.read(&mut bom).map_err(|e| format!("Failed to read BOM: {}", e))?;

    // Check for UTF-8 BOM (EF BB BF)
    if bytes_read >= 3 && bom[0] == 0xEF && bom[1] == 0xBB && bom[2] == 0xBF {
        println!("Detected UTF-8 BOM, skipping 3 bytes");
        return Ok(3);
    }

    // No BOM found, reset to beginning
    reader.seek(SeekFrom::Start(0)).map_err(|e| format!("Failed to seek: {}", e))?;
    Ok(0)
}

/// Build offset index for a CSV file
/// Returns: (offsets: Vec<u64>, delimiter: u8, headers: Vec<String>)
pub fn build_offset_index(file_path: &Path) -> Result<(Vec<u64>, u8, Vec<String>), String> {
    let file = File::open(file_path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut reader = BufReader::new(file);

    // Detect and handle BOM
    let bom_offset = detect_encoding_and_bom(&mut reader)?;

    // Detect delimiter from first few lines
    let delimiter = detect_delimiter(&mut reader)?;

    // Reset to after BOM (not beginning)
    reader
        .seek(SeekFrom::Start(bom_offset))
        .map_err(|e| format!("Failed to seek: {}", e))?;

    let mut offsets = Vec::new();
    let mut line = String::new();
    let mut current_offset: u64 = bom_offset;

    // Read header line
    let header_bytes = reader
        .read_line(&mut line)
        .map_err(|e| format!("Failed to read header: {}", e))?;

    if header_bytes == 0 {
        return Err("Empty file".to_string());
    }

    // Parse headers
    let headers = parse_csv_line(line.trim_end(), delimiter);

    current_offset += header_bytes as u64;
    line.clear();

    // Build offset index for data rows
    while reader
        .read_line(&mut line)
        .map_err(|e| format!("Failed to read line: {}", e))?
        > 0
    {
        // Skip empty lines
        if line.trim().is_empty() {
            current_offset += line.len() as u64;
            line.clear();
            continue;
        }

        offsets.push(current_offset);
        current_offset += line.len() as u64;
        line.clear();
    }

    Ok((offsets, delimiter, headers))
}

/// Detect CSV delimiter by analyzing first 5 lines
pub fn detect_delimiter<R: Read + Seek>(reader: &mut BufReader<R>) -> Result<u8, String> {
    let mut lines = Vec::new();
    let mut line = String::new();

    // Read up to 5 lines for analysis
    for _ in 0..5 {
        line.clear();
        let bytes_read = reader
            .read_line(&mut line)
            .map_err(|e| format!("Failed to read line: {}", e))?;
        if bytes_read == 0 {
            break;
        }
        lines.push(line.clone());
    }

    if lines.is_empty() {
        return Ok(b','); // Default to comma
    }

    // Count occurrences of common delimiters
    let delimiters = [b',', b';', b'\t', b'|', b' '];
    let mut delimiter_scores: Vec<(u8, f32)> = delimiters
        .iter()
        .map(|&delim| {
            let counts: Vec<usize> = lines
                .iter()
                .map(|line| {
                    let fields = count_fields_for_delimiter(line, delim);
                    if fields > 0 { fields - 1 } else { 0 }
                })
                .collect();

            // Calculate consistency score (lower variance = more consistent)
            let avg = counts.iter().sum::<usize>() as f32 / counts.len() as f32;
            let variance = counts
                .iter()
                .map(|&c| (c as f32 - avg).powi(2))
                .sum::<f32>()
                / counts.len() as f32;

            // Score: high average count, low variance
            let score = if avg > 0.0 { avg / (1.0 + variance) } else { 0.0 };

            (delim, score)
        })
        .collect();

    delimiter_scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

    // Reset reader to beginning
    reader
        .seek(SeekFrom::Start(0))
        .map_err(|e| format!("Failed to seek: {}", e))?;

    Ok(delimiter_scores[0].0)
}

/// Count fields produced by a delimiter for a given line
fn count_fields_for_delimiter(line: &str, delimiter: u8) -> usize {
    let mut reader = csv_core::ReaderBuilder::new().delimiter(delimiter).build();
    let input = line.as_bytes();
    let mut field_buf = vec![0u8; input.len().max(1)];
    let mut input_pos = 0;
    let mut count = 0;

    loop {
        let (result, bytes_read, _) =
            reader.read_field(&input[input_pos..], &mut field_buf);
        input_pos += bytes_read;

        match result {
            csv_core::ReadFieldResult::InputEmpty => {
                count += 1;
                break;
            }
            csv_core::ReadFieldResult::Field { record_end } => {
                count += 1;
                if record_end {
                    break;
                }
            }
            csv_core::ReadFieldResult::OutputFull | csv_core::ReadFieldResult::End => break,
        }
    }

    count
}

/// Read a single row by its index
pub fn read_row_at_offset(
    file_path: &Path,
    offset: u64,
    delimiter: u8,
) -> Result<Vec<String>, String> {
    let mut file = File::open(file_path).map_err(|e| format!("Failed to open file: {}", e))?;

    file.seek(SeekFrom::Start(offset))
        .map_err(|e| format!("Failed to seek to offset: {}", e))?;

    let mut reader = BufReader::new(file);
    let mut line = String::new();

    reader
        .read_line(&mut line)
        .map_err(|e| format!("Failed to read line: {}", e))?;

    Ok(parse_csv_line(line.trim_end(), delimiter))
}

/// Parse a CSV line respecting quotes
fn parse_csv_line(line: &str, delimiter: u8) -> Vec<String> {
    let mut reader = csv_core::ReaderBuilder::new().delimiter(delimiter).build();
    let input = line.as_bytes();
    let mut fields = Vec::new();
    let mut field_buf = vec![0u8; input.len().max(1)];
    let mut input_pos = 0;

    loop {
        let (result, bytes_read, bytes_written) =
            reader.read_field(&input[input_pos..], &mut field_buf);
        input_pos += bytes_read;

        match result {
            csv_core::ReadFieldResult::InputEmpty => {
                fields.push(String::from_utf8_lossy(&field_buf[..bytes_written]).into_owned());
                break;
            }
            csv_core::ReadFieldResult::Field { record_end } => {
                fields.push(String::from_utf8_lossy(&field_buf[..bytes_written]).into_owned());
                if record_end {
                    break;
                }
            }
            csv_core::ReadFieldResult::OutputFull | csv_core::ReadFieldResult::End => break,
        }
    }

    fields
}

/// Write a row in-place (same or different length strategy)
pub fn write_row_at_offset(
    file_path: &Path,
    offset: u64,
    new_row_fields: &[String],
    delimiter: u8,
    old_row_length: Option<usize>,
) -> Result<(), String> {
    // Format new row
    let new_row = format_csv_row(new_row_fields, delimiter);
    let new_row_bytes = new_row.as_bytes();
    let new_row_len = new_row_bytes.len();

    let mut file = OpenOptions::new()
        .read(true)
        .write(true)
        .open(file_path)
        .map_err(|e| format!("Failed to open file for writing: {}", e))?;

    // If we know the old row length and it matches, we can do in-place overwrite
    if let Some(old_len) = old_row_length {
        if new_row_len == old_len {
            // Simple in-place overwrite
            file.seek(SeekFrom::Start(offset))
                .map_err(|e| format!("Failed to seek: {}", e))?;
            file.write_all(new_row_bytes)
                .map_err(|e| format!("Failed to write: {}", e))?;
            return Ok(());
        }
    }

    // Different length: read tail, write new row + tail
    // Find the end of the current row
    file.seek(SeekFrom::Start(offset))
        .map_err(|e| format!("Failed to seek: {}", e))?;

    let mut reader = BufReader::new(file.try_clone().unwrap());
    let mut old_line = String::new();
    reader
        .read_line(&mut old_line)
        .map_err(|e| format!("Failed to read old line: {}", e))?;

    let next_row_offset = offset + old_line.len() as u64;

    // Get file size to determine tail size
    let file_size = file.metadata()
        .map_err(|e| format!("Failed to get file metadata: {}", e))?
        .len();
    let tail_size = file_size - next_row_offset;

    // Threshold: 500MB
    const LARGE_FILE_THRESHOLD: u64 = 500 * 1024 * 1024;

    if file_size > LARGE_FILE_THRESHOLD {
        // Use streaming for large files
        write_tail_streamed(&mut file, offset, new_row_bytes, next_row_offset, tail_size)?;
    } else {
        // Use in-memory buffer for smaller files (faster)
        let mut tail = Vec::new();
        reader
            .seek(SeekFrom::Start(next_row_offset))
            .map_err(|e| format!("Failed to seek to tail: {}", e))?;
        reader
            .read_to_end(&mut tail)
            .map_err(|e| format!("Failed to read tail: {}", e))?;

        // Write new row at offset
        file.seek(SeekFrom::Start(offset))
            .map_err(|e| format!("Failed to seek for write: {}", e))?;
        file.write_all(new_row_bytes)
            .map_err(|e| format!("Failed to write new row: {}", e))?;

        // Write tail
        file.write_all(&tail)
            .map_err(|e| format!("Failed to write tail: {}", e))?;

        // Truncate if file got shorter
        let new_file_len = offset + new_row_len as u64 + tail.len() as u64;
        file.set_len(new_file_len)
            .map_err(|e| format!("Failed to truncate: {}", e))?;
    }

    Ok(())
}

/// Format a row for CSV output (with proper quoting)
fn format_csv_row(fields: &[String], delimiter: u8) -> String {
    let mut writer = WriterBuilder::new()
        .delimiter(delimiter)
        .from_writer(Vec::new());

    writer.write_record(fields).expect("write to Vec cannot fail");
    let bytes = writer.into_inner().expect("flush Vec cannot fail");
    String::from_utf8(bytes).expect("csv output is valid UTF-8")
}

/// Detect image column by name pattern
pub fn detect_image_column(headers: &[String]) -> Option<usize> {
    let patterns = ["img_path", "image", "img", "photo", "picture", "file"];

    headers.iter().position(|header| {
        let lower = header.to_lowercase();
        patterns.iter().any(|&pattern| lower.contains(pattern))
    })
}

/// Detect class columns (columns with "CLASS" in name, case-insensitive)
pub fn detect_class_columns(headers: &[String]) -> Vec<usize> {
    headers
        .iter()
        .enumerate()
        .filter(|(_, header)| header.to_uppercase().contains("CLASS"))
        .map(|(idx, _)| idx)
        .collect()
}

/// Extract unique values from a specific column
pub fn extract_unique_values(
    file_path: &Path,
    _offsets: &[u64],
    column_index: usize,
    delimiter: u8,
) -> Result<Vec<String>, String> {
    let mut unique_values = std::collections::HashSet::new();
    let file = File::open(file_path).map_err(|e| format!("Failed to open file: {}", e))?;

    let mut reader = csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .has_headers(true)
        .from_reader(BufReader::new(file));

    for result in reader.records() {
        let record = result.map_err(|e| format!("Failed to read record: {}", e))?;
        if let Some(value) = record.get(column_index) {
            if !value.is_empty() {
                unique_values.insert(value.to_string());
            }
        }
    }

    let mut values: Vec<String> = unique_values.into_iter().collect();
    values.sort();

    Ok(values)
}

/// Calculate memory usage of the offset index
pub fn calculate_index_memory_usage(offset_count: usize) -> usize {
    // Each offset is 8 bytes (u64)
    offset_count * std::mem::size_of::<u64>()
}

/// Verify memory usage is within acceptable limits
pub fn verify_memory_budget(offset_count: usize, max_memory_mb: usize) -> bool {
    let memory_bytes = calculate_index_memory_usage(offset_count);
    let memory_mb = memory_bytes / (1024 * 1024);

    println!(
        "Memory profiling: {} rows, {} bytes ({:.2} MB) for offset index",
        offset_count,
        memory_bytes,
        memory_bytes as f64 / (1024.0 * 1024.0)
    );

    memory_mb <= max_memory_mb
}

/// Write tail using streaming for large files (>500MB)
/// Uses a temporary file to avoid loading entire tail into memory
fn write_tail_streamed(
    file: &mut File,
    offset: u64,
    new_row_bytes: &[u8],
    tail_start: u64,
    tail_size: u64,
) -> Result<(), String> {
    const CHUNK_SIZE: usize = 8 * 1024 * 1024; // 8MB chunks

    println!(
        "Using streaming write for large file (tail size: {:.2} MB)",
        tail_size as f64 / (1024.0 * 1024.0)
    );

    // Create temporary file
    let temp_path = std::env::temp_dir().join(format!("csv_tail_{}.tmp", std::process::id()));
    let mut temp_file = File::create(&temp_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;

    // Copy tail to temp file in chunks
    let mut reader = BufReader::new(file.try_clone().unwrap());
    reader
        .seek(SeekFrom::Start(tail_start))
        .map_err(|e| format!("Failed to seek to tail: {}", e))?;

    let mut buffer = vec![0u8; CHUNK_SIZE];
    let mut copied = 0u64;

    loop {
        let bytes_read = reader
            .read(&mut buffer)
            .map_err(|e| format!("Failed to read chunk: {}", e))?;

        if bytes_read == 0 {
            break;
        }

        temp_file
            .write_all(&buffer[..bytes_read])
            .map_err(|e| format!("Failed to write to temp file: {}", e))?;

        copied += bytes_read as u64;
    }

    println!("Copied {} bytes to temp file", copied);

    // Write new row at offset
    file.seek(SeekFrom::Start(offset))
        .map_err(|e| format!("Failed to seek for write: {}", e))?;
    file.write_all(new_row_bytes)
        .map_err(|e| format!("Failed to write new row: {}", e))?;

    // Stream tail back from temp file
    temp_file
        .seek(SeekFrom::Start(0))
        .map_err(|e| format!("Failed to seek temp file: {}", e))?;
    let mut temp_reader = BufReader::new(temp_file);

    loop {
        let bytes_read = temp_reader
            .read(&mut buffer)
            .map_err(|e| format!("Failed to read from temp: {}", e))?;

        if bytes_read == 0 {
            break;
        }

        file.write_all(&buffer[..bytes_read])
            .map_err(|e| format!("Failed to write tail chunk: {}", e))?;
    }

    // Truncate to new size
    let new_file_len = offset + new_row_bytes.len() as u64 + tail_size;
    file.set_len(new_file_len)
        .map_err(|e| format!("Failed to truncate: {}", e))?;

    // Clean up temp file
    std::fs::remove_file(&temp_path).ok();

    println!("Streaming write completed");

    Ok(())
}
