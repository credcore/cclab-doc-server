#!/bin/bash
# ftx-delete-doc.sh - Delete a document from all FTX indexes

# Default values, prioritizing environment variables if available
HOST="${MEILISEARCH_HOST:-localhost}"
PORT="${MEILISEARCH_PORT:-7700}"
DOC_ID=""

# Show usage information
show_usage() {
    echo "Usage: $0 --host <host> --port <port> --doc-id <doc_id>"
    echo ""
    echo "Options:"
    echo "  --host <host>     Meilisearch host (default: ${MEILISEARCH_HOST:-localhost})"
    echo "  --port <port>     Meilisearch port (default: ${MEILISEARCH_PORT:-7700})"
    echo "  --doc-id <doc_id> Document ID to delete (required)"
    echo "  --help            Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  MEILISEARCH_KEY   Meilisearch API key (required)"
    echo "  MEILISEARCH_HOST  Meilisearch host (optional, overridden by --host)"
    echo "  MEILISEARCH_PORT  Meilisearch port (optional, overridden by --port)"
    echo ""
    echo "Example:"
    echo "  MEILISEARCH_KEY=your_key $0 --host localhost --port 7700 --doc-id document_123"
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
        --doc-id)
            DOC_ID="$2"
            shift 2
            ;;
        --help)
            show_usage
            ;;
        *)
            echo "❌ Unknown option: $1"
            show_usage
            ;;
    esac
done

# Check if API key is provided via environment variable
if [ -z "${MEILISEARCH_KEY}" ]; then
    echo "❌ Error: MEILISEARCH_KEY environment variable is required"
    show_usage
fi

if [ -z "$DOC_ID" ]; then
    echo "❌ Error: Document ID is required"
    show_usage
fi

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Call the Node.js script for deletion
node "$SCRIPT_DIR/ftx-delete-doc.js" --host "$HOST" --port "$PORT" --doc-id "$DOC_ID"

if [ $? -ne 0 ]; then
    echo "❌ Error deleting document: $DOC_ID"
    exit 1
else
    echo "✅ Document successfully deleted: $DOC_ID"
    exit 0
fi