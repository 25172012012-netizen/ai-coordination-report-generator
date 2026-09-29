import { createRequire } from 'module';
import { ExtractedDocument } from '../types.js';

const require = createRequire(import.meta.url);

export async function extractFromPdf(buffer: Buffer, filename: string): Promise<ExtractedDocument> {
  try {
    const pdf = require('pdf-parse');
    const data = await pdf(buffer);
    const rawText = data.text || '';

    return {
      filename,
      rawText,
    };
  } catch (err: any) {
    // Fallback printable text extraction if pdf-parse encounters format quirks
    const printable = buffer.toString('latin1');
    const matches = [...printable.matchAll(/\(([^()]{2,})\)/g)].map(x => x[1].replace(/\\[()]/g, ''));
    const fallbackText = matches.join(' ');

    return {
      filename,
      rawText: fallbackText || `Failed to extract PDF text: ${err.message}`,
    };
  }
}
