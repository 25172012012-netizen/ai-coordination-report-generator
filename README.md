# AI Coordination Report Generator

A production-grade, modular operational document-to-report generation tool. Built strictly for the core workflow: **Upload → Extract → Normalize → Cross-Document Match → Grounded Report → Edit/Copy/Print**.

It is deliberately focused on operational document coordination, not an ERP or CRM.

---

## Key Features

1. **Multi-Format Extraction**:
   - Accepts `.xlsx`, `.xls`, `.csv` (via SheetJS with header discovery and date conversion).
   - Accepts `.pdf` (via text extraction with fallback).
   - Accepts `.docx` (via Mammoth document parser).
2. **Strict Grounding Rule**:
   - Never fabricates or hallucinates information. Missing fields are rendered exactly as:
     `Not Available in Uploaded Data`
3. **Cross-Document Merger & Conflict Detection**:
   - Identifies matching orders (e.g. OA 04, OA 09, OA 13, OA 14, OA 16, OA 03) across multiple documents.
   - Detects and surfaces discrepancies (differing quantities, dates, or statuses) with source file attribution.
4. **Exact Fixed-Format Coordination Report**:
   - Deterministically generates the required executive summary and per-order coordination breakdown.
5. **Interactive UI & Exports**:
   - Full live-editable report view with line/word counts.
   - 1-click **Copy Report to Clipboard** with instant toast feedback.
   - **Download .TXT** export.
   - **Print / Save as PDF** with print styles and print preview modal.
   - Interactive order cards matrix with department badges and search filtering.
6. **Backend-Only LLM Adapter**:
   - Optional LLM integration (`OPENAI_API_KEY` / `GEMINI_API_KEY`) isolated entirely on the backend.
   - 100% functional offline with zero external dependencies when no API key is provided.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express, TypeScript, Multer, SheetJS (`xlsx`), `pdf-parse`, `mammoth`
- **Testing**: Vitest with comprehensive suites covering edge cases and sample data.

---

## Quick Start

### 1. Install dependencies
```powershell
npm install
```

### 2. Run the application
```powershell
# Run backend server
npm start

# Or run Vite dev server in another terminal
npm run dev
```

Open `http://localhost:3001` (or `http://localhost:5173` in dev mode).

### 3. Run Tests
```powershell
npm test
```

---

## Test Suite Coverage

- `tests/sampleWorkbook.test.ts`: Verifies extraction of all 12 orders from `ORDER STATUS Sept.xlsx`.
- `tests/pipeline.test.ts`:
  - Multi-order extraction and canonical ID mapping.
  - Strict grounding enforcement (`Not Available in Uploaded Data`).
  - Cross-document conflict detection and source attribution.
  - Fuzzy column header matching and title row skipping.
  - Ragged tables and empty cell handling.
  - Free-form text and meeting minutes extraction (.pdf / .docx).
  - High-volume workbook performance simulation (500+ orders in < 1 second).
