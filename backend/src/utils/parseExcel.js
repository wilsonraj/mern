import xlsx from 'xlsx';

/**
 * Parses an Excel file (.xlsx / .xls) into an array of row objects.
 * @param {string} filePath - Path to the Excel file
 * @returns {Array<Object>}
 */
const parseExcel = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
};

export default parseExcel;
