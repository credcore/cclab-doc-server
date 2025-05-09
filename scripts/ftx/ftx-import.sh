#!/bin/bash
# ftx-import.sh - Import documents into Meilisearch for FTX project

# Default values, prioritizing environment variables if available
HOST="${MEILISEARCH_HOST:-localhost}"
PORT="${MEILISEARCH_PORT:-7700}"
DIR_MODE=false
DIRECTORY=""
FILES=()
FORMAT="json"  # Default format is JSON

# Show usage information
show_usage() {
    echo "Usage: $0 [options] [file1.json] [file2.json] ..."
    echo "  or   $0 [options] --dir <directory>"
    echo ""
    echo "Options:"
    echo "  --host <host>      Meilisearch host (default: ${MEILISEARCH_HOST:-localhost})"
    echo "  --port <port>      Meilisearch port (default: ${MEILISEARCH_PORT:-7700})"
    echo "  --dir <directory>  Process all JSON files in directory"
    echo "  --jsonl            Process files as JSONL (JSON Lines) format"
    echo "  --help             Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  MEILISEARCH_KEY    Meilisearch API key (required)"
    echo "  MEILISEARCH_HOST   Meilisearch host (optional, overridden by --host)"
    echo "  MEILISEARCH_PORT   Meilisearch port (optional, overridden by --port)"
    echo ""
    echo "Examples:"
    echo "  MEILISEARCH_KEY=your_key $0 --host localhost --port 7700 file.json"
    echo "  MEILISEARCH_KEY=your_key $0 --dir --jsonl ./static/data"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --host)
            HOST="$2"
            shift 2
        ;;
        --port)
            PORT="$2"
            shift 2
        ;;
        --dir)
            DIR_MODE=true
            DIRECTORY="$2"
            shift 2
        ;;
        --jsonl)
            FORMAT="jsonl"
            shift
        ;;
        --help)
            show_usage
        ;;
        -*)
            echo "❌ Unknown option: $1"
            show_usage
        ;;
        *)
            FILES+=("$1")
            shift
        ;;
    esac
done

# Check if API key is provided via environment variable
if [ -z "${MEILISEARCH_KEY}" ]; then
    echo "❌ Error: MEILISEARCH_KEY environment variable is required"
    show_usage
fi

# Validate directory or files
if [ "$DIR_MODE" = true ]; then
    if [ ! -d "$DIRECTORY" ]; then
        echo "❌ Error: Directory '$DIRECTORY' does not exist"
        exit 1
    fi
    
    # Find all JSON/JSONL files in the directory and handle spaces in filenames correctly
    if [ "$FORMAT" = "jsonl" ]; then
        echo "🔍 Searching for files with extension .json or .jsonl in JSONL format..."
        readarray -d $'\0' FILES < <(find "$DIRECTORY" -type f \( -name "*.json" -o -name "*.jsonl" \) -print0)
    else
        echo "🔍 Searching for JSON files..."
        readarray -d $'\0' FILES < <(find "$DIRECTORY" -type f -name "*.json" -print0)
    fi
    
    if [ ${#FILES[@]} -eq 0 ]; then
        echo "❌ Error: No matching files found in '$DIRECTORY'"
        exit 1
    fi
    
    echo "🔍 Found ${#FILES[@]} files in '$DIRECTORY'"
else
    # Check if at least one file is provided
    if [ ${#FILES[@]} -eq 0 ]; then
        echo "❌ Error: No input files specified"
        show_usage
    fi
    
    # Check if all files exist
    for file in "${FILES[@]}"; do
        if [ ! -f "$file" ]; then
            echo "❌ Error: File '$file' does not exist"
            exit 1
        fi
    done
fi

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Process each file
for file in "${FILES[@]}"; do
    filename=$(basename "$file")
    echo "📄 Processing file: $filename"
    
    # Call the Node.js script for processing with format flag
    if [ "$FORMAT" = "jsonl" ]; then
        node "$SCRIPT_DIR/ftx-import.js" --host "$HOST" --port "$PORT" --file "$file" --jsonl
    else
        node "$SCRIPT_DIR/ftx-import.js" --host "$HOST" --port "$PORT" --file "$file"
    fi
    
    if [ $? -ne 0 ]; then
        echo "❌ Error processing file: $filename"
    else
        echo "✅ Successfully processed file: $filename"
    fi
    
    echo "-----------------------------------"
done

echo "✅ All files processed."