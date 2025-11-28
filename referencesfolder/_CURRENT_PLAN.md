# Execution Plan: Fix Brands/Units/Categories Import - Header Aliases (Plurals)

## Problem
Settings entity imports fail because CSVs use plural headers (e.g. "Brands") which are not mapped to the expected field ("name").

## Tasks
- [x] `backend/src/services/settingsImportExportService.js`: Add plural aliases (`brands` -> `name`, `units` -> `name`, `categories` -> `name`) to header normalization.
