# FTX Meilisearch Tools

A set of Node.js tools for managing FTX document data in Meilisearch.

## Overview

These scripts provide functionality to:

1. Import document data (paragraphs and definitions) into Meilisearch indexes
2. Delete specific documents by ID
3. Delete all indexes

## Index Structure

The scripts create and manage three indexes:

1. **`ftx_paras`** - Individual paragraphs from documents
   - Primary key: `File_Para_ID`
   - Contains paragraph content, section info, page numbers, etc.

2. **`ftx_defs`** - Defined terms with their definitions
   - Primary key: `File_Defined_Term_Id`
   - Contains terms and their definitions extracted from documents

3. **`ftx_docs`** - Document-level metadata
   - Primary key: `doc_id`
   - Contains basic document information (name, filename, sector, industry)

## Installation

1. Make sure Node.js is installed (v16+ recommended)

2. Make the scripts executable (if needed):

   ```bash
   chmod +x ftx-import.sh ftx-delete-doc.sh ftx-delete-indexes.sh
   ```

3. Create your environment file:

   ```bash
   cp .env.example .env
   # Edit .env and set your Meilisearch API key
   ```

## Environment Variables

All scripts require the following environment variable:

- `MEILISEARCH_KEY` - Meilisearch API key

Optional environment variables (with defaults):

- `MEILISEARCH_HOST` - Meilisearch host (default: localhost)
- `MEILISEARCH_PORT` - Meilisearch port (default: 7700)

These can be set in the `.env` file or directly in your shell.

## Manual Usage

If you prefer not to use the convenience script, you can run the commands directly:

```bash
# Import a single file
MEILISEARCH_KEY=your_key ./ftx-import.sh --host localhost --port 7700 static/data/sample.index.json

# Import multiple files
MEILISEARCH_KEY=your_key ./ftx-import.sh --host localhost --port 7700 file1.index.json file2.index.json

# Process all .index.json files in a directory
MEILISEARCH_KEY=your_key ./ftx-import.sh --host localhost --port 7700 --dir ./static/data
```

## Data Structure

The scripts expect JSONL input files (one JSON object per line) with the following structure:

```json
{
  "Doc_Name": "HLLY - Amendment no 1",
  "Sector": "<sector>",
  "Industry": "<industry>",
  "Para_ID": 1,
  "Section_Name": "ARTICLE I",
  "Category": "FYI",
  "Tags": [""],
  "Definition_Ref": [],
  "Section_Ref": [],
  "NERs": ["LAW"],
  "Defined_Term": "",
  "Numbering": "",
  "Start_Page": 193,
  "End_Page": 193,
  "Region_Coordinates": "[280.293, 446.0872, 329.4388, 437.1872]",
  "Content": "ARTICLE IX"
}
```

## Troubleshooting

- If you encounter permission issues, make sure the shell scripts are executable
- Ensure your Meilisearch instance is running and accessible
- Make sure your .env file is properly configured with a valid API key
- For JSON parsing errors, check that your input files follow the JSONL format (one JSON object per line)