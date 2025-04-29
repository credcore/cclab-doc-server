# CC Lab Document Management

## Overview

Tools for managing and indexing document content in the CC Lab ecosystem.

## Features

- Meilisearch integration for fast full-text search
- Document parsing and indexing
- Term definition extraction

## Components

### Meilisearch Tools

In the `scripts` directory, you'll find tools for managing documents in Meilisearch:

- Import document data from JSON files
- Delete documents by ID
- Delete indexes

See [Scripts README](scripts/README.md) for detailed usage instructions.

## Getting Started

1. Make sure you have Node.js installed (v16+ recommended)
2. Configure your Meilisearch credentials in an environment file
3. Use the provided scripts to import and manage your document data

```bash
# Navigate to the scripts directory
cd scripts

# Copy and edit the environment template
cp .env.example .env
# Edit .env with your Meilisearch API key

# Use the environment loader to run commands
./load-env.sh "./ftx-import.sh --dir ../static/data"
```