# Changelog

## [Unreleased]

### Fixed
- Class dropdown fields now preserve empty values instead of auto-selecting the first option
- Users can now view and edit CSV rows with empty classification fields without accidental data corruption
- Whitespace-only values in class fields are now preserved as distinct from empty values
- Adding new class values no longer auto-applies them to empty fields

### Technical
- Added empty option as first option in all class dropdowns
- Added 11 new test cases for empty value handling
- Empty fields display as blank dropdown selection instead of auto-selecting first alphabetically sorted value
