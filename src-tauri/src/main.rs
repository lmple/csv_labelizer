// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod csv_engine;
mod state;

use state::CsvState;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Mutex::new(CsvState::default()))
        .invoke_handler(tauri::generate_handler![
            commands::open_csv,
            commands::get_row,
            commands::get_csv_stats,
            commands::save_row,
            commands::get_class_columns,
            commands::add_class_value,
            commands::set_image_column,
            commands::copy_and_save,
            commands::search_rows,
            commands::advanced_search_rows,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
