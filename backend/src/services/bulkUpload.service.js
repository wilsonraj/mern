import fs from 'fs';
import path from 'path';
import parseCSV from '../utils/parseCSV.js';
import parseExcel from '../utils/parseExcel.js';
import { validateProduct } from '../validations/product.validation.js';
import { Product } from '../models/index.js';

const BATCH_SIZE = 500;

/**
 * Reads and parses the uploaded file based on its extension.
 */
const parseFile = async (filePath, ext) => {
  if (ext === '.csv') {
    return parseCSV(filePath);
  }
  return parseExcel(filePath);
};

/**
 * Normalizes a raw row from CSV/Excel into a Product-shaped object.
 * Adjust field mapping here to match your spreadsheet column headers.
 */
const normalizeRow = (row) => ({
  name: row.name || row.Name || '',
  sku: row.sku || row.SKU || undefined,
  category: row.category || row.Category || '',
  price: row.price || row.Price || 0,
  quantity: row.quantity || row.Quantity || 0,
  description: row.description || row.Description || ''
});

/**
 * Processes an uploaded bulk file:
 * - parses rows
 * - validates each row
 * - inserts valid rows in batches
 * - returns a summary of successes and failures
 */
const processBulkUpload = async (filePath, originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const rawRows = await parseFile(filePath, ext);

  const validRows = [];
  const failedRows = [];

  rawRows.forEach((row, index) => {
    const normalized = normalizeRow(row);
    const { isValid, errors } = validateProduct(normalized);

    if (isValid) {
      validRows.push(normalized);
    } else {
      failedRows.push({ row: index + 1, data: row, errors });
    }
  });

  let insertedCount = 0;
  const insertErrors = [];

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    try {
      const result = await Product.insertMany(batch, { ordered: false });
      insertedCount += result.length;
    } catch (err) {
      // insertMany with ordered:false still throws but reports partial success
      if (err.result && err.result.result) {
        insertedCount += err.result.result.nInserted || 0;
      }
      insertErrors.push(err.message);
    }
  }

  // Clean up temp file
  fs.unlink(filePath, () => {});

  return {
    totalRows: rawRows.length,
    insertedCount,
    failedValidationCount: failedRows.length,
    failedRows,
    insertErrors
  };
};

export { processBulkUpload };
