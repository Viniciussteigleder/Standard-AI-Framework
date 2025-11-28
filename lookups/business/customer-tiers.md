---
id: customer-tiers
domain: business
type: reference
version: 1.0.0
lastUpdated: 2024-01-15
author: business-team
tags:
  - customers
  - pricing
  - tiers

# Validation
schema:
  type: array
  items:
    type: object
    properties:
      tier:
        type: string
      minRevenue:
        type: number
      discountPercent:
        type: number
      benefits:
        type: array
---

# Customer Tiers Reference

This document defines the customer tier structure used across all pricing and service delivery decisions.

## Tier Definitions

### Tier 1: Enterprise
- **Minimum Annual Revenue**: €1,000,000+
- **Discount**: 25%
- **Benefits**:
  - Dedicated account manager
  - Priority support (4-hour SLA)
  - Custom integrations
  - Quarterly business reviews
  - Early access to new features

### Tier 2: Business
- **Minimum Annual Revenue**: €100,000 - €999,999
- **Discount**: 15%
- **Benefits**:
  - Named support contact
  - Priority support (24-hour SLA)
  - Standard integrations
  - Annual business review

### Tier 3: Professional
- **Minimum Annual Revenue**: €10,000 - €99,999
- **Discount**: 10%
- **Benefits**:
  - Email support
  - Standard SLA (48-hour)
  - Self-service integrations

### Tier 4: Starter
- **Minimum Annual Revenue**: Under €10,000
- **Discount**: 0%
- **Benefits**:
  - Community support
  - Documentation access
  - Standard features

## Structured Data

```json
[
  {
    "tier": "Enterprise",
    "code": "T1",
    "minRevenue": 1000000,
    "discountPercent": 25,
    "slaHours": 4,
    "benefits": ["dedicated_am", "priority_support", "custom_integrations", "qbr", "early_access"]
  },
  {
    "tier": "Business",
    "code": "T2",
    "minRevenue": 100000,
    "discountPercent": 15,
    "slaHours": 24,
    "benefits": ["named_contact", "priority_support", "standard_integrations", "abr"]
  },
  {
    "tier": "Professional",
    "code": "T3",
    "minRevenue": 10000,
    "discountPercent": 10,
    "slaHours": 48,
    "benefits": ["email_support", "self_service_integrations"]
  },
  {
    "tier": "Starter",
    "code": "T4",
    "minRevenue": 0,
    "discountPercent": 0,
    "slaHours": 72,
    "benefits": ["community_support", "documentation"]
  }
]
```

## Usage in Agent Context

When determining customer tier:
1. Query customer's annual revenue from CRM
2. Match against tier thresholds
3. Apply appropriate discount and benefits

## Related Lookups

- `pricing-rules.md` - Detailed pricing calculations
- `discount-codes.md` - Special discount codes
- `sla-definitions.md` - SLA terms and conditions
