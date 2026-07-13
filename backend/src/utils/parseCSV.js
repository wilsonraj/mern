import fs from 'fs';
import csv from 'csv-parser';

/**
 * Parses a CSV file into an array of row objects.
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array<Object>>}
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
};

export default parseCSV;
