import mammoth from 'mammoth';
import { ExtractedDocument } from '../types.js';

export async function extractFromDocx(buffer: Buffer, filename: string): Promise<ExtractedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      filename,
      rawText: result.value || '',
    };
  } catch (err: any) {
    return {
      filename,
      rawText: `Failed to extract DOCX text: ${err.message}`,
    };
  }
}
