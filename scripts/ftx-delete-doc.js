#!/usr/bin/env node
// ftx-delete-doc.js - Delete a document from all FTX indexes

// Parse command line arguments
const args = process.argv.slice(2);
let host = 'localhost';
let port = '7700';
let docId = '';

for (let i = 0; i < args.length; i += 2) {
  if (args[i] === '--host') host = args[i + 1];
  else if (args[i] === '--port') port = args[i + 1];
  else if (args[i] === '--doc-id') docId = args[i + 1];
}

// Get API key from environment variable
const key = process.env.MEILISEARCH_KEY;

// Validate arguments
if (!key) {
  console.error('❌ Error: MEILISEARCH_KEY environment variable is required');
  process.exit(1);
}

if (!docId) {
  console.error('❌ Error: Document ID is required');
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

// Delete document from document index
async function deleteDocument() {
  try {
    console.log(`🗑️ Deleting document '${docId}' from ${DOCS_INDEX} index...`);
    
    const response = await fetch(`${baseUrl}/indexes/${DOCS_INDEX}/documents/${docId}`, {
      method: 'DELETE',
      headers,
    });
    
    if (response.ok) {
      console.log(`✅ Document deleted from ${DOCS_INDEX} index`);
    } else {
      const data = await response.json();
      if (data.message && data.message.includes('not found')) {
        console.log(`ℹ️ Document '${docId}' not found in ${DOCS_INDEX} index`);
      } else {
        console.error(`❌ Error deleting document from ${DOCS_INDEX} index: ${data.message}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error deleting document from ${DOCS_INDEX} index: ${error.message}`);
  }
}

// Delete related paragraphs
async function deleteParagraphs() {
  try {
    console.log(`🔍 Finding paragraphs for document '${docId}' in ${PARAS_INDEX} index...`);
    
    // Use filter to find all paragraphs for this document
    const response = await fetch(`${baseUrl}/indexes/${PARAS_INDEX}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: `doc_id = ${docId}`,
        limit: 1000, // Adjust as needed
      }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      console.error(`❌ Error searching paragraphs: ${data.message}`);
      return;
    }
    
    const searchData = await response.json();
    const paraIds = searchData.hits.map(hit => hit.File_Para_ID);
    
    if (paraIds.length === 0) {
      console.log(`ℹ️ No paragraphs found for document '${docId}'`);
      return;
    }
    
    console.log(`🗑️ Deleting ${paraIds.length} paragraphs from ${PARAS_INDEX} index...`);
    
    // Delete all found paragraphs
    const deleteResponse = await fetch(`${baseUrl}/indexes/${PARAS_INDEX}/documents/delete-batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify(paraIds),
    });
    
    if (deleteResponse.ok) {
      console.log(`✅ Paragraphs deleted from ${PARAS_INDEX} index`);
    } else {
      const data = await deleteResponse.json();
      console.error(`❌ Error deleting paragraphs: ${data.message}`);
    }
  } catch (error) {
    console.error(`❌ Error processing paragraphs: ${error.message}`);
  }
}

// Delete related definitions
async function deleteDefinitions() {
  try {
    console.log(`🔍 Finding definitions for document '${docId}' in ${DEFS_INDEX} index...`);
    
    // Use filter to find all definitions for this document
    const response = await fetch(`${baseUrl}/indexes/${DEFS_INDEX}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: `doc_id = ${docId}`,
        limit: 1000, // Adjust as needed
      }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      console.error(`❌ Error searching definitions: ${data.message}`);
      return;
    }
    
    const searchData = await response.json();
    const defIds = searchData.hits.map(hit => hit.File_Defined_Term_Id);
    
    if (defIds.length === 0) {
      console.log(`ℹ️ No definitions found for document '${docId}'`);
      return;
    }
    
    console.log(`🗑️ Deleting ${defIds.length} definitions from ${DEFS_INDEX} index...`);
    
    // Delete all found definitions
    const deleteResponse = await fetch(`${baseUrl}/indexes/${DEFS_INDEX}/documents/delete-batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify(defIds),
    });
    
    if (deleteResponse.ok) {
      console.log(`✅ Definitions deleted from ${DEFS_INDEX} index`);
    } else {
      const data = await deleteResponse.json();
      console.error(`❌ Error deleting definitions: ${data.message}`);
    }
  } catch (error) {
    console.error(`❌ Error processing definitions: ${error.message}`);
  }
}

// Main execution
(async () => {
  try {
    console.log(`🔍 Starting deletion of document '${docId}' and related content...`);
    
    // Delete in parallel
    await Promise.all([
      deleteDocument(),
      deleteParagraphs(),
      deleteDefinitions()
    ]);
    
    console.log('✅ Document deletion completed successfully');
  } catch (error) {
    console.error(`❌ Unexpected error: ${error.message}`);
    process.exit(1);
  }
})();