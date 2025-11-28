---
id: price-checker
name: Price Checker
category: data
version: 1.0.0
description: Retrieves and compares pricing data from various sources
author: framework
tags:
  - pricing
  - data-retrieval
  - comparison

# Schema definitions
inputSchema:
  type: object
  properties:
    productId:
      type: string
      description: Product identifier or SKU
    sources:
      type: array
      items:
        type: string
      description: List of data sources to query
    currency:
      type: string
      default: EUR
  required:
    - productId

outputSchema:
  type: object
  properties:
    productId:
      type: string
    prices:
      type: array
      items:
        type: object
        properties:
          source:
            type: string
          price:
            type: number
          currency:
            type: string
          timestamp:
            type: string
    lowestPrice:
      type: number
    averagePrice:
      type: number

# Implementation reference
codePath: packages/ai/skills/price-checker.ts
testPath: tests/unit/skills/price-checker.test.ts

# Dependencies
dependencies:
  - google-sheets
  - database

# Rate limits
rateLimits:
  maxCallsPerMinute: 60
  maxCallsPerHour: 500

# Prompts
systemPromptAddition: |
  When using the price-checker skill:
  - Always specify the currency if known
  - Include multiple sources for comparison when available
  - Report the lowest price prominently
---

# Price Checker Skill

## Overview

The Price Checker skill retrieves pricing information from multiple configured data sources and provides comparison analysis.

## Use Cases

1. **Product price comparison** - Compare prices across suppliers
2. **Price trend analysis** - Track historical pricing
3. **Competitive analysis** - Monitor competitor pricing

## Example Usage

### Agent Prompt
```
Check the current price for product SKU-12345 from our main suppliers.
```

### Tool Call
```json
{
  "name": "price_checker",
  "arguments": {
    "productId": "SKU-12345",
    "sources": ["supplier_a", "supplier_b", "internal"],
    "currency": "EUR"
  }
}
```

### Response
```json
{
  "productId": "SKU-12345",
  "prices": [
    { "source": "supplier_a", "price": 24.99, "currency": "EUR" },
    { "source": "supplier_b", "price": 22.50, "currency": "EUR" },
    { "source": "internal", "price": 23.75, "currency": "EUR" }
  ],
  "lowestPrice": 22.50,
  "averagePrice": 23.75
}
```

## Configuration

Required environment variables:
- `PRICE_API_KEY` - API key for external price services
- `PRICE_CACHE_TTL` - Cache duration in seconds (default: 300)

## Error Handling

| Error Code | Description | Recovery |
|------------|-------------|----------|
| `PRODUCT_NOT_FOUND` | Product ID doesn't exist | Verify product ID |
| `SOURCE_UNAVAILABLE` | Data source is down | Retry or use fallback |
| `RATE_LIMITED` | Too many requests | Wait and retry |

## Related Skills

- `inventory-checker` - Check stock levels
- `supplier-lookup` - Find supplier information
- `price-history` - Historical price trends
