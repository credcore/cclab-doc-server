#!/usr/bin/env node
// ftx-delete-indexes.js - Delete all FTX indexes from Meilisearch

// Parse command line arguments
const args = process.argv.slice(2);
let host = 'localhost';
let port = '7700';

for (let i = 0; i < args.length; i += 2) {
  if (args[i] === '--host') host = args[i + 1];
  else if (args[i] === '--port') port = args[i + 1];
}

// Get API key from environment variable
const key = process.env.MEILISEARCH_KEY;

// Validate arguments
if (!key) {
  console.error('❌ Error: MEILISEARCH_KEY environment variable is required');
  process.exit(1);
}

// Base URL for Meilisearch API
const baseUrl = `http://${host}:${port}`;
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${key}`
};

// Index names
const PARAS_INDEX = 'ftx_paras';
const DEFS_INDEX = 'ftx_defs';
const DOCS_INDEX = 'ftx_docs';

// Function to delete an index
async function deleteIndex(indexName) {
  try {
    console.log(`🗑️ Deleting '${indexName}' index...`);
    
    const response = await fetch(`${baseUrl}/indexes/${indexName}`, {
      method: 'DELETE',
      headers,
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Index '${indexName}' deleted successfully (Task ID: ${data.taskUid})`);
      return true;
    } else {
      const data = await response.json();
      if (data.message && data.message.includes('not found')) {
        console.log(`ℹ️ Index '${indexName}' does not exist or was already deleted`);
        return true;
      } else {
        console.error(`❌ Error deleting index '${indexName}': ${data.message}`);
        return false;
      }
    }
  } catch (error) {
    console.error(`❌ Error deleting index '${indexName}': ${error.message}`);
    return false;
  }
}

// Main execution
(async () => {
  try {
    console.log('🔍 Starting deletion of all FTX indexes...');
    
    // Delete all three indexes
    const results = await Promise.all([
      deleteIndex(PARAS_INDEX),
      deleteIndex(DEFS_INDEX),
      deleteIndex(DOCS_INDEX)
    ]);
    
    // Check if all deletions were successful
    if (results.every(result => result)) {
      console.log('✅ All indexes deleted successfully');
    } else {
      console.error('⚠️ Some indexes could not be deleted');
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Unexpected error: ${error.message}`);
    process.exit(1);
  }
})();