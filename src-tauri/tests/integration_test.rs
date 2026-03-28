use std::fs;

// Import the modules we're testing
#[allow(dead_code)]
mod csv_engine {
    include!("../src/csv_engine.rs");
}

#[allow(dead_code)]
mod state {
    include!("../src/state.rs");
}

#[test]
fn test_complete_workflow() {
    // Create a temporary test CSV file
    let test_dir = std::env::temp_dir().join(format!("csv_test_{}", std::process::id()));
    fs::create_dir_all(&test_dir).unwrap();
    let csv_path = test_dir.join("test.csv");

    // Write test CSV data
    let csv_content = "ID,Name,CLASS_TYPE,img_path\n\
                      1,Alice,TypeA,image1.jpg\n\
                      2,Bob,TypeB,image2.jpg\n\
                      3,Charlie,TypeA,image3.jpg\n";

    fs::write(&csv_path, csv_content).unwrap();

    println!("Test CSV created at: {:?}", csv_path);

    // Step 1: Open CSV and build offset index
    println!("\n=== Step 1: Open CSV ===");
    let (offsets, delimiter, headers) =
        csv_engine::build_offset_index(&csv_path).expect("Failed to build offset index");

    assert_eq!(headers.len(), 4, "Should have 4 headers");
    assert_eq!(headers[0], "ID");
    assert_eq!(headers[1], "Name");
    assert_eq!(headers[2], "CLASS_TYPE");
    assert_eq!(headers[3], "img_path");
    assert_eq!(offsets.len(), 3, "Should have 3 data rows");
    assert_eq!(delimiter, b',', "Delimiter should be comma");

    println!("✓ CSV opened successfully");
    println!("  Headers: {:?}", headers);
    println!("  Rows: {}", offsets.len());
    println!("  Delimiter: {}", delimiter as char);

    // Step 2: Navigate to different rows
    println!("\n=== Step 2: Navigate Rows ===");

    // Read first row
    let row_0 = csv_engine::read_row_at_offset(&csv_path, offsets[0], delimiter)
        .expect("Failed to read row 0");
    assert_eq!(row_0.len(), 4);
    assert_eq!(row_0[0], "1");
    assert_eq!(row_0[1], "Alice");
    assert_eq!(row_0[2], "TypeA");
    println!("✓ Row 0: {:?}", row_0);

    // Read second row
    let row_1 = csv_engine::read_row_at_offset(&csv_path, offsets[1], delimiter)
        .expect("Failed to read row 1");
    assert_eq!(row_1[1], "Bob");
    println!("✓ Row 1: {:?}", row_1);

    // Read third row
    let row_2 = csv_engine::read_row_at_offset(&csv_path, offsets[2], delimiter)
        .expect("Failed to read row 2");
    assert_eq!(row_2[1], "Charlie");
    println!("✓ Row 2: {:?}", row_2);

    // Step 3: Edit a row (change Bob's class from TypeB to TypeA)
    println!("\n=== Step 3: Edit Row ===");
    let edited_row = vec![
        "2".to_string(),
        "Bob".to_string(),
        "TypeA".to_string(), // Changed from TypeB
        "image2.jpg".to_string(),
    ];

    csv_engine::write_row_at_offset(&csv_path, offsets[1], &edited_row, delimiter, None)
        .expect("Failed to write row");

    println!("✓ Row 1 edited (changed CLASS_TYPE to TypeA)");

    // Step 4: Save and rebuild index
    println!("\n=== Step 4: Save and Rebuild Index ===");
    let (new_offsets, _, _) =
        csv_engine::build_offset_index(&csv_path).expect("Failed to rebuild index");

    assert_eq!(new_offsets.len(), 3, "Should still have 3 rows");
    println!("✓ Index rebuilt");

    // Step 5: Reopen and verify persistence
    println!("\n=== Step 5: Verify Persistence ===");
    let verified_row = csv_engine::read_row_at_offset(&csv_path, new_offsets[1], delimiter)
        .expect("Failed to read verified row");

    assert_eq!(verified_row[1], "Bob", "Name should still be Bob");
    assert_eq!(
        verified_row[2], "TypeA",
        "CLASS_TYPE should be TypeA (persisted)"
    );
    println!("✓ Changes persisted correctly");
    println!("  Verified row 1: {:?}", verified_row);

    // Step 6: Test class column detection
    println!("\n=== Step 6: Class Column Detection ===");
    let class_columns = csv_engine::detect_class_columns(&headers);
    assert_eq!(class_columns.len(), 1, "Should detect 1 class column");
    assert_eq!(class_columns[0], 2, "CLASS_TYPE should be at index 2");
    println!("✓ Class column detected at index: {}", class_columns[0]);

    // Step 7: Test unique value extraction
    println!("\n=== Step 7: Extract Unique Values ===");
    let unique_classes =
        csv_engine::extract_unique_values(&csv_path, &new_offsets, 2, delimiter)
            .expect("Failed to extract unique values");

    assert_eq!(unique_classes.len(), 1, "Should have 1 unique class (all TypeA now)");
    assert_eq!(unique_classes[0], "TypeA");
    println!("✓ Unique CLASS_TYPE values: {:?}", unique_classes);

    // Step 8: Test image column detection
    println!("\n=== Step 8: Image Column Detection ===");
    let image_column = csv_engine::detect_image_column(&headers);
    assert_eq!(image_column, Some(3), "img_path should be detected");
    println!("✓ Image column detected at index: {:?}", image_column);

    // Step 9: Test delimiter detection
    println!("\n=== Step 9: Delimiter Detection ===");
    let detected_delimiter = {
        let file = fs::File::open(&csv_path).unwrap();
        let mut reader = std::io::BufReader::new(file);
        csv_engine::detect_delimiter(&mut reader).unwrap()
    };
    assert_eq!(detected_delimiter, b',');
    println!("✓ Delimiter detected: '{}'", detected_delimiter as char);

    // Cleanup
    fs::remove_dir_all(&test_dir).ok();
    println!("\n=== Test Complete ===");
    println!("✓ All workflow steps passed!");
}

#[test]
fn test_quoted_csv_handling() {
    // Test CSV with quoted fields containing delimiters
    let test_dir = std::env::temp_dir().join(format!("csv_test_quotes_{}", std::process::id()));
    fs::create_dir_all(&test_dir).unwrap();
    let csv_path = test_dir.join("test_quoted.csv");

    let csv_content = "ID,Description,CLASS\n\
                      1,\"Contains, comma\",TypeA\n\
                      2,\"Has \"\"quotes\"\"\",TypeB\n\
                      3,Simple,TypeC\n";

    fs::write(&csv_path, csv_content).unwrap();

    let (offsets, delimiter, _headers) = csv_engine::build_offset_index(&csv_path).unwrap();

    // Read first row with comma in quoted field
    let row_0 = csv_engine::read_row_at_offset(&csv_path, offsets[0], delimiter).unwrap();
    assert_eq!(row_0[1], "Contains, comma", "Should preserve comma in quotes");

    // Read second row with escaped quotes
    let row_1 = csv_engine::read_row_at_offset(&csv_path, offsets[1], delimiter).unwrap();
    assert_eq!(row_1[1], "Has \"quotes\"", "Should handle escaped quotes");

    // Write back a row with special characters
    let edited_row = vec![
        "1".to_string(),
        "New, value with comma".to_string(),
        "TypeA".to_string(),
    ];

    csv_engine::write_row_at_offset(&csv_path, offsets[0], &edited_row, delimiter, None).unwrap();

    // Verify it was written correctly
    let (new_offsets, _, _) = csv_engine::build_offset_index(&csv_path).unwrap();
    let verified = csv_engine::read_row_at_offset(&csv_path, new_offsets[0], delimiter).unwrap();
    assert_eq!(verified[1], "New, value with comma");

    fs::remove_dir_all(&test_dir).ok();
}
