import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
  maxUploadSizeBytes: 50 * 1024 * 1024, // 50MB
};
