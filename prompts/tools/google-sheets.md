---
id: google-sheets-tool
name: Google Sheets Tool Prompt
version: 1.0.0
category: tools
toolName: google_sheets
---

# Google Sheets Tool Usage

## When to Use

Use the Google Sheets tool when you need to:
- Read data from a spreadsheet
- Write or update data in a spreadsheet
- Append new rows to a spreadsheet
- Check data freshness or structure

## Tool Parameters

```json
{
  "action": "read" | "write" | "append",
  "spreadsheetId": "string - the spreadsheet ID from the URL",
  "range": "string - A1 notation like 'Sheet1!A1:D10'",
  "values": "array - only for write/append actions"
}
```

## Best Practices

### Before Reading
1. Confirm the spreadsheet ID with the user if not obvious
2. Start with a small range to understand the data structure
3. Ask about which sheet/tab if multiple exist

### Interpreting Results
- Check for empty cells and handle them appropriately
- Note the data types (strings, numbers, dates)
- Watch for header rows vs data rows

### When Writing
- Always confirm write actions with the user first
- Preserve existing data formats
- Handle errors gracefully (permission issues, etc.)

## Common Patterns

### Reading a full table
```
Range: "Sheet1!A:Z" - reads all columns
Range: "Sheet1!A1:Z1000" - reads up to 1000 rows
```

### Reading specific columns
```
Range: "Sheet1!A:A,C:C" - reads columns A and C
```

### Appending data
```
Range: "Sheet1!A:D" - appends to the next empty row
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `PERMISSION_DENIED` | No access to sheet | Ask user to share the sheet |
| `NOT_FOUND` | Wrong spreadsheet ID | Verify the ID from the URL |
| `INVALID_RANGE` | Malformed range | Check A1 notation syntax |

## Response Format

After reading data, summarize:
1. Number of rows/columns retrieved
2. Column headers (if applicable)
3. Quick overview of the data
4. Any notable patterns or issues

After writing data:
1. Confirm what was written
2. Specify the exact range affected
3. Note any formatting applied
