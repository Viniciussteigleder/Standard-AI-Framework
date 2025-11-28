/**
 * Price Checker Skill
 * 
 * Retrieves and compares pricing data from various sources.
 * 
 * @skill price-checker
 * @category data
 * @version 1.0.0
 */

import { createTool } from '../tools';
import { z } from 'zod';
import { createLogger } from '@framework/config';

const logger = createLogger('skill:price-checker');

// =============================================================================
// SCHEMAS
// =============================================================================

export const PriceCheckerInputSchema = z.object({
  productId: z.string().min(1).describe('Product identifier or SKU'),
  sources: z.array(z.string()).optional().describe('Data sources to query'),
  currency: z.string().default('EUR').describe('Currency for prices'),
});

export const PriceEntrySchema = z.object({
  source: z.string(),
  price: z.number(),
  currency: z.string(),
  timestamp: z.string(),
});

export const PriceCheckerOutputSchema = z.object({
  productId: z.string(),
  prices: z.array(PriceEntrySchema),
  lowestPrice: z.number(),
  averagePrice: z.number(),
  queriedAt: z.string(),
});

export type PriceCheckerInput = z.infer<typeof PriceCheckerInputSchema>;
export type PriceCheckerOutput = z.infer<typeof PriceCheckerOutputSchema>;

// =============================================================================
// PRICE SOURCES
// =============================================================================

interface PriceSource {
  name: string;
  fetch: (productId: string, currency: string) => Promise<number | null>;
}

const defaultSources: PriceSource[] = [
  {
    name: 'internal',
    fetch: async (productId, currency) => {
      // Mock internal database lookup
      logger.debug({ productId, currency }, 'Fetching from internal database');
      return Math.random() * 100 + 10;
    },
  },
  {
    name: 'supplier_api',
    fetch: async (productId, currency) => {
      // Mock external API call
      logger.debug({ productId, currency }, 'Fetching from supplier API');
      return Math.random() * 100 + 10;
    },
  },
];

// =============================================================================
// SKILL IMPLEMENTATION
// =============================================================================

export async function checkPrice(input: PriceCheckerInput): Promise<PriceCheckerOutput> {
  const { productId, sources, currency } = PriceCheckerInputSchema.parse(input);
  
  logger.info({ productId, sources, currency }, 'Checking prices');
  
  // Determine which sources to query
  const sourcesToQuery = sources 
    ? defaultSources.filter(s => sources.includes(s.name))
    : defaultSources;
  
  if (sourcesToQuery.length === 0) {
    throw new Error(`No valid sources found. Available: ${defaultSources.map(s => s.name).join(', ')}`);
  }
  
  // Fetch prices from all sources
  const pricePromises = sourcesToQuery.map(async (source) => {
    try {
      const price = await source.fetch(productId, currency);
      if (price === null) return null;
      
      return {
        source: source.name,
        price: Math.round(price * 100) / 100,
        currency,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.warn({ source: source.name, error: error.message }, 'Failed to fetch price');
      return null;
    }
  });
  
  const results = await Promise.all(pricePromises);
  const prices = results.filter((p): p is NonNullable<typeof p> => p !== null);
  
  if (prices.length === 0) {
    throw new Error(`No prices found for product ${productId}`);
  }
  
  // Calculate statistics
  const priceValues = prices.map(p => p.price);
  const lowestPrice = Math.min(...priceValues);
  const averagePrice = Math.round((priceValues.reduce((a, b) => a + b, 0) / priceValues.length) * 100) / 100;
  
  const output: PriceCheckerOutput = {
    productId,
    prices,
    lowestPrice,
    averagePrice,
    queriedAt: new Date().toISOString(),
  };
  
  logger.info({ productId, lowestPrice, averagePrice, sourceCount: prices.length }, 'Price check completed');
  
  return output;
}

// =============================================================================
// TOOL EXPORT
// =============================================================================

export const priceCheckerTool = createTool<PriceCheckerInput, PriceCheckerOutput>({
  name: 'price_checker',
  description: 'Retrieves and compares pricing data from various sources for a product.',
  parameters: {
    type: 'object',
    properties: {
      productId: {
        type: 'string',
        description: 'Product identifier or SKU',
      },
      sources: {
        type: 'array',
        items: { type: 'string' },
        description: 'Data sources to query (optional, queries all if not specified)',
      },
      currency: {
        type: 'string',
        description: 'Currency for prices (default: EUR)',
      },
    },
    required: ['productId'],
  },
  execute: checkPrice,
});

export default priceCheckerTool;
