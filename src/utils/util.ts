import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import readline from 'readline';

export function loadSpreadSheetRowObject(filepath: string, onThemeRow: (sheetName: string, rowObj: any) => void) {
  const readFileData = fs.readFileSync(filepath, 'utf8');
  const workbook = XLSX.read(readFileData, { type: 'string' });
  const sheetNames = Object.keys(workbook.Sheets);
  for (const sheetName of sheetNames) {
    const themeRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    for (const rowObj of themeRows) {
      onThemeRow(sheetName, rowObj);
    }
  }
}

export function saveToLocalFileFromString(filepath: string, data: string) {
  saveToLocalFileFromBuffer(filepath, Buffer.from(data, 'utf8'));
}

export function saveToLocalFileFromBuffer(filepath: string, data: Buffer) {
  if (!fs.existsSync(path.dirname(filepath))) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
  }
  fs.writeFileSync(filepath, data);
}

export async function sleep(millisecond: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, millisecond));
}

export function readStreamCSVFile(filePath: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const lines: string[] = [];
    const fileReadStream = fs.createReadStream(filePath);
    const reader = readline.createInterface({ input: fileReadStream });
    reader.on('line', async (rowString) => {
      lines.push(rowString);
    });
    reader.on('close', async () => {
      resolve(lines);
    });
  });
}

export async function readStreamCSVFileToHeaderObjs(filePath: string): Promise<{ [key: string]: string }[]> {
  const lines = await readStreamCSVFile(filePath);
  const headerObjects: { [key: string]: string }[] = [];
  const headerString = lines.shift();
  if (headerString) {
    const headers = headerString.split(',');
    for (let i = 0; i < lines.length; ++i) {
      const lineString = lines[i];
      const cells = lineString.split(',');
      if (cells.length < headers.length) {
        continue;
      }
      const headerObject: { [key: string]: string } = {};
      for (let j = 0; j < headers.length; ++j) {
        const header = headers[j];
        if (cells[j]) {
          headerObject[header] = cells[j];
        }
      }
      headerObjects.push(headerObject);
    }
  }
  return headerObjects;
}
