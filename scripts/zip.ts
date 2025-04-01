import { createWriteStream } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = resolve(__dirname, '../dist');
const OUTPUT_FILE = resolve(__dirname, '../xdebug-pro.zip');

// Create output stream
const output = createWriteStream(OUTPUT_FILE);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

// Listen for events
output.on('close', () => {
  console.log(`✅ Archive created: ${OUTPUT_FILE}`);
  console.log(`📦 Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});

archive.on('error', (err) => {
  throw err;
});

// Pipe archive data to the output file
archive.pipe(output);

// Add the dist directory contents to the archive
archive.directory(DIST_DIR, false);

// Finalize the archive
archive.finalize(); 