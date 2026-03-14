use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::time::Instant;

// Import the modules we're testing
mod csv_engine {
    include!("../src/csv_engine.rs");
}

#[test]
fn test_large_file_performance() {
    println!("\n=== CSV Labelizer Performance Test ===\n");

    // Create a temporary test directory
    let test_dir = std::env::temp_dir().join(format!("csv_perf_{}", std::process::id()));
    fs::create_dir_all(&test_dir).unwrap();
    let csv_path = test_dir.join("large_test.csv");

    // Generate a large CSV file (100,000 rows)
    const ROW_COUNT: usize = 100_000;
    println!("Generating {} row CSV file...", ROW_COUNT);

    let gen_start = Instant::now();
    {
        let mut file = fs::File::create(&csv_path).unwrap();

        // Write header
        writeln!(file, "ID,Name,CLASS_TYPE,Score,img_path").unwrap();

        // Write data rows
        for i in 1..=ROW_COUNT {
            writeln!(
                file,
                "{},User{},Type{},{},image{}.jpg",
                i,
                i,
                i % 10,
                (i % 100) as f64 / 10.0,
                i
            )
            .unwrap();
        }
    }

    let gen_time = gen_start.elapsed();
    let file_size_bytes = fs::metadata(&csv_path).unwrap().len();
    let file_size_mb = file_size_bytes as f64 / (1024.0 * 1024.0);

    println!(
        "✓ Generated {} rows in {:.2}s ({:.2} MB)",
        ROW_COUNT,
        gen_time.as_secs_f64(),
        file_size_mb
    );

    // Test 1: Open time (should be <5 seconds)
    println!("\n--- Test 1: Open Performance ---");
    let open_start = Instant::now();
    let (offsets, delimiter, headers) =
        csv_engine::build_offset_index(&csv_path).expect("Failed to build offset index");
    let open_time = open_start.elapsed();

    println!("Open time: {:.3}s", open_time.as_secs_f64());
    println!("Rows indexed: {}", offsets.len());
    println!("Headers: {:?}", headers);
    println!("Delimiter: {}", delimiter as char);

    assert_eq!(offsets.len(), ROW_COUNT, "Should have indexed all rows");
    assert!(
        open_time.as_secs() < 5,
        "Open time should be < 5 seconds (was {:.2}s)",
        open_time.as_secs_f64()
    );
    println!("✓ PASS: Open time < 5 seconds");

    // Test 2: Navigation performance (should be <100ms)
    println!("\n--- Test 2: Navigation Performance ---");

    // Test random access to different rows
    let test_indices = vec![0, 1000, 50000, 99999];
    let mut max_nav_time = std::time::Duration::ZERO;

    for &idx in &test_indices {
        let nav_start = Instant::now();
        let row = csv_engine::read_row_at_offset(&csv_path, offsets[idx], delimiter)
            .expect("Failed to read row");
        let nav_time = nav_start.elapsed();

        if nav_time > max_nav_time {
            max_nav_time = nav_time;
        }

        println!(
            "  Row {}: {:.3}ms (ID={}, Name={})",
            idx,
            nav_time.as_secs_f64() * 1000.0,
            row[0],
            row[1]
        );

        // Verify correctness
        assert_eq!(row[0], (idx + 1).to_string(), "ID should match");
    }

    println!("Max navigation time: {:.3}ms", max_nav_time.as_secs_f64() * 1000.0);

    assert!(
        max_nav_time.as_millis() < 100,
        "Navigation should be < 100ms (was {:.2}ms)",
        max_nav_time.as_secs_f64() * 1000.0
    );
    println!("✓ PASS: Navigation time < 100ms");

    // Test 3: Memory usage (should be <200MB for offset index)
    println!("\n--- Test 3: Memory Usage ---");

    let memory_bytes = csv_engine::calculate_index_memory_usage(offsets.len());
    let memory_mb = memory_bytes as f64 / (1024.0 * 1024.0);

    println!("Offset index memory: {:.2} MB ({} bytes)", memory_mb, memory_bytes);
    println!("Bytes per row: {}", memory_bytes / offsets.len());

    assert!(
        memory_mb < 200.0,
        "Memory usage should be < 200MB (was {:.2}MB)",
        memory_mb
    );
    assert_eq!(
        memory_bytes / offsets.len(),
        8,
        "Should use exactly 8 bytes per row"
    );
    println!("✓ PASS: Memory usage < 200MB");

    // Test 4: Write performance
    println!("\n--- Test 4: Write Performance ---");

    // Edit a row in the middle
    let edit_idx = 50000;
    let edited_row = vec![
        "50001".to_string(),
        "EditedUser".to_string(),
        "TypeX".to_string(),
        "99.9".to_string(),
        "edited.jpg".to_string(),
    ];

    let write_start = Instant::now();
    csv_engine::write_row_at_offset(&csv_path, offsets[edit_idx], &edited_row, delimiter, None)
        .expect("Failed to write row");
    let write_time = write_start.elapsed();

    println!("Write time: {:.3}ms", write_time.as_secs_f64() * 1000.0);

    // Verify the write
    let (new_offsets, _, _) = csv_engine::build_offset_index(&csv_path).unwrap();
    let verified = csv_engine::read_row_at_offset(&csv_path, new_offsets[edit_idx], delimiter)
        .expect("Failed to read verified row");

    assert_eq!(verified[1], "EditedUser", "Edit should persist");
    println!("✓ PASS: Write successful and verified");

    // Test 5: Class column detection and unique value extraction
    println!("\n--- Test 5: Class Column Operations ---");

    let class_start = Instant::now();
    let class_columns = csv_engine::detect_class_columns(&headers);
    let unique_values = csv_engine::extract_unique_values(&csv_path, &new_offsets, 2, delimiter)
        .expect("Failed to extract unique values");
    let class_time = class_start.elapsed();

    println!("Class detection time: {:.3}ms", class_time.as_secs_f64() * 1000.0);
    println!("Class columns: {:?}", class_columns);
    println!("Unique values (first 5): {:?}", &unique_values[..unique_values.len().min(5)]);
    println!("Total unique values: {}", unique_values.len());

    assert_eq!(class_columns.len(), 1, "Should detect 1 class column");
    assert!(unique_values.len() >= 10, "Should have at least 10 unique types");
    println!("✓ PASS: Class column operations completed");

    // Cleanup
    fs::remove_dir_all(&test_dir).ok();

    println!("\n=== Performance Test Summary ===");
    println!("✓ Open time: {:.3}s (target: <5s)", open_time.as_secs_f64());
    println!(
        "✓ Navigation: {:.3}ms (target: <100ms)",
        max_nav_time.as_secs_f64() * 1000.0
    );
    println!("✓ Memory: {:.2}MB (target: <200MB)", memory_mb);
    println!("✓ All {} tests passed!", ROW_COUNT);
}

#[test]
#[ignore] // Run with: cargo test --test performance_test --ignored
fn test_very_large_file_streaming() {
    // This test creates a 500MB+ file to test streaming
    println!("\n=== Streaming Performance Test (500MB+ file) ===\n");

    let test_dir = std::env::temp_dir().join(format!("csv_stream_{}", std::process::id()));
    fs::create_dir_all(&test_dir).unwrap();
    let csv_path = test_dir.join("huge_test.csv");

    // Generate a file large enough to trigger streaming (>500MB)
    // With ~100 bytes per row, we need about 5 million rows
    const LARGE_ROW_COUNT: usize = 5_000_000;
    println!("Generating {} row CSV file (this may take a while)...", LARGE_ROW_COUNT);

    let gen_start = Instant::now();
    {
        let mut file = fs::File::create(&csv_path).unwrap();
        writeln!(file, "ID,Name,Description,CLASS_TYPE,Score,img_path").unwrap();

        for i in 1..=LARGE_ROW_COUNT {
            writeln!(
                file,
                "{},User{},\"This is a longer description for row {}\",Type{},{},image{}.jpg",
                i,
                i,
                i,
                i % 10,
                (i % 100) as f64 / 10.0,
                i
            )
            .unwrap();

            if i % 500_000 == 0 {
                println!("  Generated {} rows...", i);
            }
        }
    }

    let gen_time = gen_start.elapsed();
    let file_size = fs::metadata(&csv_path).unwrap().len();
    let file_size_mb = file_size as f64 / (1024.0 * 1024.0);

    println!(
        "✓ Generated {} rows in {:.2}s ({:.2} MB)",
        LARGE_ROW_COUNT,
        gen_time.as_secs_f64(),
        file_size_mb
    );

    assert!(
        file_size_mb > 500.0,
        "File should be >500MB to test streaming"
    );

    // Test streaming write
    println!("\n--- Testing Streaming Write ---");

    let (offsets, delimiter, _) = csv_engine::build_offset_index(&csv_path).unwrap();

    let edit_row = vec![
        "2500001".to_string(),
        "StreamedUser".to_string(),
        "Updated with streaming".to_string(),
        "TypeY".to_string(),
        "100.0".to_string(),
        "streamed.jpg".to_string(),
    ];

    let write_start = Instant::now();
    csv_engine::write_row_at_offset(&csv_path, offsets[2_500_000], &edit_row, delimiter, None)
        .expect("Failed to write with streaming");
    let write_time = write_start.elapsed();

    println!("Streaming write time: {:.3}s", write_time.as_secs_f64());
    println!("✓ Streaming write completed successfully");

    fs::remove_dir_all(&test_dir).ok();
}
