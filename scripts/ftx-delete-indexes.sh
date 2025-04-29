#!/bin/bash

# ftx-delete-indexes.sh - Delete all FTX indexes from Meilisearch

# Default values, prioritizing environment variables if available
HOST="${MEILISEARCH_HOST:-localhost}"
PORT="${MEILISEARCH_PORT:-7700}"

# Show usage information
show_usage() {
    echo "Usage: $0 --host <host> --port <port>"
    echo ""
    echo "Options:"
    echo "  --host <host>    Meilisearch host (default: ${MEILISEARCH_HOST:-localhost})"
    echo "  --port <port>    Meilisearch port (default: ${MEILISEARCH_PORT:-7700})"
    echo "  --help           Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  MEILISEARCH_KEY  Meilisearch API key (required)"
    echo "  MEILISEARCH_HOST Meilisearch host (optional, overridden by --host)"
    echo "  MEILISEARCH_PORT Meilisearch port (optional, overridden by --port)"
    echo ""
    echo "Example:"
    echo "  MEILISEARCH_KEY=your_key $0 --host localhost --port 7700"
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

# Index names
PARAS_INDEX="ftx_paras"
DEFS_INDEX="ftx_defs"
DOCS_INDEX="ftx_docs"

# Base URL for Meilisearch API
BASE_URL="http://$HOST:$PORT"

echo "🔍 Using Meilisearch at $BASE_URL"
echo "⚠️ WARNING: You are about to delete the following indexes:"
echo "   - $PARAS_INDEX"
echo "   - $DEFS_INDEX"
echo "   - $DOCS_INDEX"
echo ""
echo "⚠️ All documents in these indexes will be permanently deleted."
echo ""
echo "To confirm deletion, please type 'yes': "
read confirmation

if [ "$confirmation" != "yes" ]; then
    echo "🛑 Deletion cancelled. You must type 'yes' to confirm."
    exit 1
fi

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Call the Node.js script for index deletion
node "$SCRIPT_DIR/ftx-delete-indexes.js" --host "$HOST" --port "$PORT"

if [ $? -ne 0 ]; then
    echo "❌ Error deleting indexes"
    exit 1
else
    echo "✅ All indexes successfully deleted"
    exit 0
fi