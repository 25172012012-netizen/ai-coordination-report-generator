import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { extractFromExcel } from './extractors/excelExtractor.js';
import { extractFromPdf } from './extractors/pdfExtractor.js';
import { extractFromDocx } from './extractors/docxExtractor.js';
import { normalizeRows, normalizeFreeText } from './pipeline/normalizer.js';
import { mergeExtractedOrders } from './pipeline/orderMerger.js';
import { generateFixedReport } from './pipeline/reportGenerator.js';
import { enrichWithLLM } from './pipeline/aiEnricher.js';
import { ExtractedDocument, OrderRecord, GenerationResult, NOT_AVAILABLE } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadSizeBytes },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    llmConfigured: Boolean(config.openaiApiKey || config.geminiApiKey),
    supportedFormats: ['.xlsx', '.xls', '.csv', '.pdf', '.docx'],
  });
});

// Process files pipeline helper
async function processFiles(
  files: { originalname: string; buffer: Buffer }[],
  useAi: boolean = false
): Promise<GenerationResult> {
  const warnings: string[] = [];
  const processedNames: string[] = [];
  const extractedOrderLists: OrderRecord[][] = [];
  let combinedRawContext = '';

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    processedNames.push(file.originalname);

    try {
      if (['.xlsx', '.xls', '.csv'].includes(ext)) {
        const doc = extractFromExcel(file.buffer, file.originalname);
        if (doc.rows && doc.rows.length > 0) {
          const orders = normalizeRows(doc.rows, file.originalname);
          extractedOrderLists.push(orders);
          combinedRawContext += `\n[File: ${file.originalname}]\n` + JSON.stringify(doc.rows.slice(0, 15));
        } else {
          warnings.push(`File "${file.originalname}" was empty or contained no valid tabular rows.`);
        }
      } else if (ext === '.pdf') {
        const doc = await extractFromPdf(file.buffer, file.originalname);
        const orders = normalizeFreeText(doc.rawText || '', file.originalname);
        if (orders.length > 0) {
          extractedOrderLists.push(orders);
        } else {
          warnings.push(`File "${file.originalname}" extracted text but could not identify specific Order/OA numbers.`);
        }
        combinedRawContext += `\n[File: ${file.originalname}]\n` + (doc.rawText || '').slice(0, 2000);
      } else if (ext === '.docx') {
        const doc = await extractFromDocx(file.buffer, file.originalname);
        const orders = normalizeFreeText(doc.rawText || '', file.originalname);
        if (orders.length > 0) {
          extractedOrderLists.push(orders);
        } else {
          warnings.push(`File "${file.originalname}" extracted text but could not identify specific Order/OA numbers.`);
        }
        combinedRawContext += `\n[File: ${file.originalname}]\n` + (doc.rawText || '').slice(0, 2000);
      } else {
        warnings.push(`Unsupported file format "${ext}" in file "${file.originalname}". Supported: .xlsx, .xls, .csv, .pdf, .docx`);
      }
    } catch (err: any) {
      warnings.push(`Error parsing "${file.originalname}": ${err.message}`);
    }
  }

  if (extractedOrderLists.length === 0 || extractedOrderLists.every(list => list.length === 0)) {
    throw new Error('No orders could be identified in the uploaded document(s). Please verify the file contains Order/OA reference numbers.');
  }

  // Multi-document merger and conflict detector
  let { orders, summary, hasConflicts } = mergeExtractedOrders(extractedOrderLists);

  let llmEnriched = false;
  if (useAi) {
    const aiResult = await enrichWithLLM(orders, summary, combinedRawContext);
    orders = aiResult.orders;
    llmEnriched = aiResult.llmEnriched;
    if (aiResult.warning) {
      warnings.push(aiResult.warning);
    }
  }

  // Generate strictly structured report text
  const reportText = generateFixedReport(summary, orders);

  return {
    summary,
    orders,
    reportText,
    filesProcessed: processedNames,
    warnings,
    hasConflicts,
    llmEnriched,
  };
}

// Generate report from uploaded files
app.post('/api/generate', upload.array('files', 20), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one document (.xlsx, .xls, .csv, .pdf, .docx).' });
    }

    const useAi = req.body?.useAI === 'true' || req.body?.useAI === true;
    const filePayload = files.map(f => ({ originalname: f.originalname, buffer: f.buffer }));
    const result = await processFiles(filePayload, useAi);

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to process documents and generate report.' });
  }
});

// Load sample report from the provided ORDER STATUS Sept.xlsx
app.get('/api/sample', async (req: Request, res: Response) => {
  try {
    const samplePath = path.join(rootDir, 'work', 'ORDER STATUS Sept.xlsx');
    if (!fs.existsSync(samplePath)) {
      return res.status(404).json({ error: 'Sample workbook ORDER STATUS Sept.xlsx not found in work directory.' });
    }

    const buffer = fs.readFileSync(samplePath);
    const result = await processFiles([{ originalname: 'ORDER STATUS Sept.xlsx', buffer }], false);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to load sample: ${err.message}` });
  }
});

// Serve static files in production
const distDir = path.join(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req: Request, res: Response) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const serverPort = config.port;
app.listen(serverPort, () => {
  console.log(`AI Coordination Report Generator backend running on port ${serverPort}`);
});

export { app, processFiles };
