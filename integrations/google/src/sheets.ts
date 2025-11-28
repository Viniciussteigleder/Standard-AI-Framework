/**
 * Google Sheets Integration
 * 
 * Provides read/write access to Google Sheets for data sync and automation.
 * 
 * Usage:
 *   import { createGoogleSheetsClient } from '@framework/integrations/google';
 *   
 *   const sheets = await createGoogleSheetsClient();
 *   const data = await sheets.read('spreadsheetId', 'Sheet1!A1:D10');
 */

import { createLogger } from '@framework/config';
import { ExternalServiceError } from '@framework/core';

const logger = createLogger('google-sheets');

// =============================================================================
// TYPES
// =============================================================================

export interface SheetRange {
  spreadsheetId: string;
  range: string;
}

export interface SheetData {
  values: unknown[][];
  range: string;
}

export interface GoogleSheetsClient {
  read(spreadsheetId: string, range: string): Promise<SheetData>;
  write(spreadsheetId: string, range: string, values: unknown[][]): Promise<void>;
  append(spreadsheetId: string, range: string, values: unknown[][]): Promise<void>;
  clear(spreadsheetId: string, range: string): Promise<void>;
  getSpreadsheet(spreadsheetId: string): Promise<SpreadsheetMetadata>;
}

export interface SpreadsheetMetadata {
  id: string;
  title: string;
  sheets: Array<{
    id: number;
    title: string;
    rowCount: number;
    columnCount: number;
  }>;
}

export interface GoogleSheetsConfig {
  credentials: {
    type: 'service_account' | 'oauth';
    email?: string;
    privateKey?: string;
    accessToken?: string;
  };
}

// =============================================================================
// CLIENT IMPLEMENTATION
// =============================================================================

class GoogleSheetsClientImpl implements GoogleSheetsClient {
  private sheets: any; // Google Sheets API client
  private initialized = false;
  private config: GoogleSheetsConfig;
  
  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }
  
  private async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const { google } = await import('googleapis');
      
      let auth;
      
      if (this.config.credentials.type === 'service_account') {
        auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: this.config.credentials.email,
            private_key: this.config.credentials.privateKey?.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      } else {
        auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: this.config.credentials.accessToken });
      }
      
      this.sheets = google.sheets({ version: 'v4', auth });
      this.initialized = true;
      
      logger.info('Google Sheets client initialized');
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to initialize Google Sheets client');
      throw new ExternalServiceError('Google Sheets', error);
    }
  }
  
  async read(spreadsheetId: string, range: string): Promise<SheetData> {
    await this.init();
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      
      logger.debug({ spreadsheetId, range, rows: response.data.values?.length }, 'Read from sheet');
      
      return {
        values: response.data.values || [],
        range: response.data.range,
      };
    } catch (error: any) {
      logger.error({ error: error.message, spreadsheetId, range }, 'Failed to read from sheet');
      throw new ExternalServiceError('Google Sheets', error);
    }
  }
  
  async write(spreadsheetId: string, range: string, values: unknown[][]): Promise<void> {
    await this.init();
    
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      
      logger.debug({ spreadsheetId, range, rows: values.length }, 'Wrote to sheet');
    } catch (error: any) {
      logger.error({ error: error.message, spreadsheetId, range }, 'Failed to write to sheet');
      throw new ExternalServiceError('Google Sheets', error);
    }
  }
  
  async append(spreadsheetId: string, range: string, values: unknown[][]): Promise<void> {
    await this.init();
    
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
      });
      
      logger.debug({ spreadsheetId, range, rows: values.length }, 'Appended to sheet');
    } catch (error: any) {
      logger.error({ error: error.message, spreadsheetId, range }, 'Failed to append to sheet');
      throw new ExternalServiceError('Google Sheets', error);
    }
  }
  
  async clear(spreadsheetId: string, range: string): Promise<void> {
    await this.init();
    
    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range,
      });
      
      logger.debug({ spreadsheetId, range }, 'Cleared sheet range');
    } catch (error: any) {
      logger.error({ error: error.message, spreadsheetId, range }, 'Failed to clear sheet');
      throw new ExternalServiceError('Google Sheets', error);
    }
  }
  
  async getSpreadsheet(spreadsheetId: string): Promise<SpreadsheetMetadata> {
    await this.init();
    
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });
      
      return {
        id: response.data.spreadsheetId,
        title: response.data.properties.title,
        sheets: response.data.sheets.map((sheet: any) => ({
          id: sheet.properties.sheetId,
          title: sheet.properties.title,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount,
        })),
      };
    } catch (error: any) {
      logger.error({ error: error.message, spreadsheetId }, 'Failed to get spreadsheet');
      throw new ExternalServiceError('Google Sheets', error);
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a Google Sheets client
 */
export async function createGoogleSheetsClient(
  config?: Partial<GoogleSheetsConfig>
): Promise<GoogleSheetsClient> {
  const { getConfig } = await import('@framework/config');
  const appConfig = getConfig();
  
  const fullConfig: GoogleSheetsConfig = {
    credentials: {
      type: 'service_account',
      email: config?.credentials?.email || appConfig.integrations.google.serviceAccountEmail,
      privateKey: config?.credentials?.privateKey || appConfig.integrations.google.serviceAccountPrivateKey,
    },
  };
  
  return new GoogleSheetsClientImpl(fullConfig);
}

// =============================================================================
// AGENT TOOL
// =============================================================================

import { createTool } from '@framework/ai/tools';

/**
 * Create a Google Sheets tool for agents
 */
export function createGoogleSheetsTool(client: GoogleSheetsClient) {
  return createTool<
    { action: 'read' | 'write' | 'append'; spreadsheetId: string; range: string; values?: unknown[][] },
    unknown
  >({
    name: 'google_sheets',
    description: 'Read from or write to Google Sheets. Use for data storage and retrieval.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['read', 'write', 'append'],
          description: 'The action to perform',
        },
        spreadsheetId: {
          type: 'string',
          description: 'The ID of the Google Spreadsheet',
        },
        range: {
          type: 'string',
          description: 'The range in A1 notation (e.g., "Sheet1!A1:D10")',
        },
        values: {
          type: 'array',
          items: { type: 'array' },
          description: 'Values to write (required for write/append)',
        },
      },
      required: ['action', 'spreadsheetId', 'range'],
    },
    execute: async ({ action, spreadsheetId, range, values }) => {
      switch (action) {
        case 'read':
          return await client.read(spreadsheetId, range);
        case 'write':
          if (!values) throw new Error('Values required for write');
          await client.write(spreadsheetId, range, values);
          return { success: true };
        case 'append':
          if (!values) throw new Error('Values required for append');
          await client.append(spreadsheetId, range, values);
          return { success: true };
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
  });
}
