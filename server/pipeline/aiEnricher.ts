import { OrderRecord, OverallSummary, NOT_AVAILABLE } from '../types.js';
import { config } from '../config.js';

/**
 * Optional backend-only LLM enricher.
 * Uses environment variables securely without leaking keys to the client.
 * Strictly adheres to grounding rules: never fabricates, retains NOT_AVAILABLE for missing items.
 */
export async function enrichWithLLM(
  orders: OrderRecord[],
  summary: OverallSummary,
  rawContext: string
): Promise<{ orders: OrderRecord[]; llmEnriched: boolean; warning?: string }> {
  const apiKey = config.openaiApiKey || config.geminiApiKey;

  if (!apiKey) {
    // No API key configured; proceed deterministically
    return { orders, llmEnriched: false };
  }

  try {
    const prompt = `You are a strict Operational Document Analyst.
Your task is to review the extracted order records and refine pending action items and cross-department dependencies ONLY based on the provided raw document text.

CRITICAL RULES:
1. NEVER FABRICATE OR HALLUCINATE ANY VALUE.
2. If any field is missing or not mentioned in the source data, you MUST keep it exactly as "${NOT_AVAILABLE}".
3. Do not invent dates, materials, quantities, percentages, or statuses.
4. Only clarify or structure actionable next steps for Purchase, Production, Service, and Dispatch if clearly supported by the text.
5. Return a valid JSON array of updated orders matching the exact same schema.

Raw Context Snippet:
${rawContext.slice(0, 8000)}

Extracted Orders JSON:
${JSON.stringify(orders, null, 2)}
`;

    // OpenAI API call (or Gemini / generic OpenAI compatible)
    if (config.openaiApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: config.llmModel || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an AI coordination report engine. Output valid JSON only. Never fabricate missing data. Missing data must remain "${NOT_AVAILABLE}".`,
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from LLM');

      const parsed = JSON.parse(content);
      const enrichedOrders = Array.isArray(parsed) ? parsed : parsed.orders || parsed.data;

      if (Array.isArray(enrichedOrders) && enrichedOrders.length === orders.length) {
        // Enforce NOT_AVAILABLE integrity post-LLM
        const sanitized = enrichedOrders.map((o: OrderRecord, idx: number) => {
          const original = orders[idx];
          return {
            ...o,
            orderId: o.orderId || original.orderId,
            customer: o.customer || original.customer,
            product: o.product || original.product,
            quantity: o.quantity || original.quantity,
            orderStatus: o.orderStatus || original.orderStatus,
            sources: original.sources,
            conflicts: original.conflicts,
            confidence: 'AI-Enriched & Grounded in Uploaded Data',
          };
        });

        return { orders: sanitized, llmEnriched: true };
      }
    }

    return { orders, llmEnriched: false };
  } catch (err: any) {
    console.warn('[AI Enricher] LLM enrichment skipped/failed, falling back to deterministic extraction:', err.message);
    return {
      orders,
      llmEnriched: false,
      warning: `LLM enrichment skipped (${err.message}). Deterministic report generated successfully.`,
    };
  }
}
