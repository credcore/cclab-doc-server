#!/usr/bin/env node
// ftx-import.js - Import documents to Meilisearch for FTX project

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Parse command line arguments
const args = process.argv.slice(2);
let host = "localhost";
let port = "7700";
let file = "";
let isJsonl = false; // New flag for JSONL format

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--host" && i + 1 < args.length) {
    host = args[i + 1];
    i++; // Skip the next argument
  } else if (args[i] === "--port" && i + 1 < args.length) {
    port = args[i + 1];
    i++; // Skip the next argument
  } else if (args[i] === "--file" && i + 1 < args.length) {
    file = args[i + 1];
    i++; // Skip the next argument
  } else if (args[i] === "--jsonl") {
    isJsonl = true;
  }
}

// Get API key from environment variable
const key = process.env.MEILISEARCH_KEY;

// Validate arguments
if (!key) {
  console.error("❌ Error: MEILISEARCH_KEY environment variable is required");
  process.exit(1);
}

if (!file) {
  console.error("❌ Error: Input file is required");
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error(`❌ Error: File '${file}' does not exist`);
  process.exit(1);
}

// Base URL for Meilisearch API
const baseUrl = `http://${host}:${port}`;
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${key}`,
};

// Index names
const PARAS_INDEX = "ftx_paras";
const DEFS_INDEX = "ftx_defs";
const DOCS_INDEX = "ftx_docs";

// Process document ID
function convertToValidDocId(inputString) {
  if (typeof inputString === "number") {
    return inputString.toString();
  }

  // Convert to string if not already
  inputString = String(inputString);

  // Convert to lowercase
  inputString = inputString.toLowerCase();

  // Replace spaces with underscores
  inputString = inputString.replace(/ /g, "_");

  // Process each character
  let result = [];
  for (let i = 0; i < inputString.length; i++) {
    const char = inputString[i];
    if (/[a-z0-9]/.test(char) && char.charCodeAt(0) < 128) {
      // Valid ASCII alphanumeric characters pass through unchanged
      result.push(char);
    } else if (char === "-" || char === "_") {
      // Hyphens and underscores pass through unchanged
      result.push(char);
    } else {
      // Replace all other characters with their Unicode code point representation
      result.push(`-${char.charCodeAt(0)}-`);
    }
  }

  return result.join("");
}

// Create an index if it doesn't exist
async function createIndex(indexName, primaryKey) {
  try {
    console.log(`📦 Creating/validating index '${indexName}'...`);

    const response = await fetch(`${baseUrl}/indexes/${indexName}`, {
      method: "GET",
      headers,
    });

    if (response.ok) {
      console.log(`✅ Index '${indexName}' already exists`);
      return;
    }

    const createResponse = await fetch(`${baseUrl}/indexes`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        uid: indexName,
        primaryKey: primaryKey,
      }),
    });

    const data = await createResponse.json();

    if (createResponse.ok) {
      console.log(`✅ Index '${indexName}' created successfully`);
    } else {
      console.error(`❌ Error creating index '${indexName}': ${data.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error accessing Meilisearch: ${error.message}`);
    process.exit(1);
  }
}

// Configure index settings
async function configureIndex(indexName, searchable, filterable, sortable) {
  try {
    // Set searchable attributes
    if (searchable && searchable.length > 0) {
      await fetch(
        `${baseUrl}/indexes/${indexName}/settings/searchable-attributes`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(searchable),
        },
      );
    }

    // Set filterable attributes
    if (filterable && filterable.length > 0) {
      await fetch(
        `${baseUrl}/indexes/${indexName}/settings/filterable-attributes`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(filterable),
        },
      );
    }

    // Set sortable attributes
    if (sortable && sortable.length > 0) {
      await fetch(
        `${baseUrl}/indexes/${indexName}/settings/sortable-attributes`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(sortable),
        },
      );
    }

    console.log(`⚙️ Index '${indexName}' configured successfully`);
  } catch (error) {
    console.error(
      `❌ Error configuring index '${indexName}': ${error.message}`,
    );
  }
}

// Read and process a file
async function processFile() {
  try {
    const fileName = path.basename(file);
    console.log(`📄 Reading file: ${fileName}`);

    let content;
    let lines = [];

    if (isJsonl) {
      // Process as JSONL (each line is a JSON object)
      content = fs.readFileSync(file, "utf8");
      lines = content.split("\n").filter((line) => line.trim());
      console.log(`🔍 Processing JSONL file with ${lines.length} lines...`);
    } else {
      // Process as regular JSON
      content = fs.readFileSync(file, "utf8");
      try {
        const jsonData = JSON.parse(content);
        if (Array.isArray(jsonData)) {
          console.log(
            `🔍 Processing JSON array with ${jsonData.length} items...`,
          );
          // If it's an array, treat each item as a "line"
          lines = jsonData.map((item) => JSON.stringify(item));
        } else {
          console.log(`🔍 Processing single JSON object...`);
          // If it's a single object, make it a one-item array
          lines = [JSON.stringify(jsonData)];
        }
      } catch (error) {
        console.error(`❌ Error parsing JSON file: ${error.message}`);
        return;
      }
    }

    if (lines.length === 0) {
      console.error("❌ No valid content found in file");
      return;
    }

    // Process paragraphs
    const paragraphs = [];
    const definitions = {};
    const uniqueDocuments = new Map();

    console.log(`🔍 Processing ${lines.length} items...`);

    for (const line of lines) {
      try {
        const para = JSON.parse(line);

        // Extract document information
        if (para.Doc_Name) {
          const docId = convertToValidDocId(para.Doc_Name);

          // Store unique documents
          if (!uniqueDocuments.has(docId)) {
            uniqueDocuments.set(docId, {
              doc_id: docId,
              name: para.Doc_Name,
              filename: fileName.replace(/\.json(l)?$/, ".pdf"),
              sector: para.Sector || "",
              industry: para.Industry || "",
              import_date: new Date().toISOString(),
            });
          }

          // Add document ID to paragraph
          para.doc_id = docId;
        }

        // Create unique paragraph ID
        para.File_Para_ID = convertToValidDocId(`${fileName}_${para.Para_ID}`);
        para.Filename = fileName.replace(/\.json(l)?$/, ".pdf");

        // Add paragraph to the list
        paragraphs.push(para);

        // Process definitions if present
        if (para.Defined_Term && para.Defined_Term !== "") {
          // Group definitions by term
          if (!definitions[para.Defined_Term]) {
            definitions[para.Defined_Term] = [];
          }
          definitions[para.Defined_Term].push(para);
        }
      } catch (error) {
        console.error(`❌ Error parsing JSON line: ${error.message}`);
      }
    }

    console.log(
      `📊 Found ${paragraphs.length} paragraphs, ${
        Object.keys(definitions).length
      } defined terms, ${uniqueDocuments.size} documents`,
    );

    // Create and configure indexes
    await createIndex(PARAS_INDEX, "File_Para_ID");
    await configureIndex(
      PARAS_INDEX,
      ["Content", "Section_Name", "Category", "Tags"],
      ["doc_id", "Category", "Tags", "Start_Page", "End_Page"],
      ["Start_Page", "Para_ID"],
    );

    await createIndex(DEFS_INDEX, "File_Defined_Term_Id");
    await configureIndex(
      DEFS_INDEX,
      ["Defined_Term", "Content"],
      ["doc_id", "Definition_Ref"],
      [],
    );

    await createIndex(DOCS_INDEX, "doc_id");
    await configureIndex(
      DOCS_INDEX,
      ["name", "sector", "industry"],
      ["doc_id", "sector", "industry"],
      ["import_date"],
    );

    // Process and upload paragraphs
    console.log(`📤 Uploading paragraphs to ${PARAS_INDEX}...`);
    const parasResponse = await fetch(
      `${baseUrl}/indexes/${PARAS_INDEX}/documents`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(paragraphs),
      },
    );

    if (!parasResponse.ok) {
      const error = await parasResponse.json();
      console.error(`❌ Error uploading paragraphs: ${error.message}`);
    } else {
      console.log(`✅ Paragraphs uploaded successfully`);
    }

    // Process and upload definitions
    if (Object.keys(definitions).length > 0) {
      console.log(
        `📤 Processing and uploading definitions to ${DEFS_INDEX}...`,
      );

      const processedDefs = [];

      // Process each defined term
      for (const term in definitions) {
        const items = definitions[term];
        const first = { ...items[0] };
        let content = "";
        const refDefSet = new Set();

        // Combine content and collect references
        for (const item of items) {
          const numbering = item.Numbering || "";
          content += numbering + item.Content + "\n";

          if (item.Definition_Ref && Array.isArray(item.Definition_Ref)) {
            for (const ref of item.Definition_Ref) {
              refDefSet.add(ref);
            }
          }
        }

        // Update the first item with combined data
        first.Definition_Ref = Array.from(refDefSet);
        first.Content = content;
        first.File_Defined_Term_Id = convertToValidDocId(`${fileName}_${term}`);
        first.Filename = fileName.replace(/\.json(l)?$/, ".pdf");

        processedDefs.push(first);
      }

      // Upload definitions
      const defsResponse = await fetch(
        `${baseUrl}/indexes/${DEFS_INDEX}/documents`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(processedDefs),
        },
      );

      if (!defsResponse.ok) {
        const error = await defsResponse.json();
        console.error(`❌ Error uploading definitions: ${error.message}`);
      } else {
        console.log(`✅ Definitions uploaded successfully`);
      }
    }

    // Upload document info
    if (uniqueDocuments.size > 0) {
      console.log(`📤 Uploading document information to ${DOCS_INDEX}...`);

      const documents = Array.from(uniqueDocuments.values());
      const docsResponse = await fetch(
        `${baseUrl}/indexes/${DOCS_INDEX}/documents`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(documents),
        },
      );

      if (!docsResponse.ok) {
        const error = await docsResponse.json();
        console.error(`❌ Error uploading documents: ${error.message}`);
      } else {
        console.log(`✅ Document information uploaded successfully`);
      }
    }

    console.log("✅ File processed successfully");
  } catch (error) {
    console.error(`❌ Error processing file: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
(async () => {
  try {
    await processFile();
  } catch (error) {
    console.error(`❌ Unexpected error: ${error.message}`);
    process.exit(1);
  }
})();
