import path from 'path';
import fs from 'fs';

export function onRowObjectFromLoadSpreadSheetFile() {}

export function saveToLocalFileFromString(filepath: string, data: string) {
  saveToLocalFileFromBuffer(filepath, Buffer.from(data, 'utf8'));
}

export function saveToLocalFileFromBuffer(filepath: string, data: Buffer) {
  if (!fs.existsSync(path.dirname(filepath))) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
  }
  fs.writeFileSync(filepath, data);
}
