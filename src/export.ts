import type { ISO4217, ExportOptions } from './types';
import { getRateHistory } from './historical';
import { analyzeMarket } from './analysis';
import * as XLSX from 'xlsx';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'node:path';
import { promises as fs } from 'node:fs';

export class ExportService {
  async exportRates(options: ExportOptions): Promise<string> {
    const { format, period, currencies, output } = options;
    
    // Calculate date range
    const days = parseInt(period.replace(/[^\d]/g, ''));
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Collect data for all currencies
    const data: any[] = [];
    
    for (const currency of currencies) {
      if (currency === 'SOS') continue; // Skip base currency
      
      try {
        const history = await getRateHistory(
          currency,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        // Add currency column to each record
        history.forEach(record => {
          data.push({
            date: record.date,
            currency,
            rate: record.rate,
            baseCurrency: 'SOS'
          });
        });
      } catch (error) {
        console.warn(`Failed to get history for ${currency}:`, error);
      }
    }

    // Sort by date
    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Generate filename if not provided
    const filename = output || this.generateFilename(format, period, currencies);

    // Export based on format
    switch (format) {
      case 'csv':
        return this.exportToCSV(data, filename);
      case 'xlsx':
        return this.exportToXLSX(data, filename);
      case 'json':
        return this.exportToJSON(data, filename);
      case 'pdf':
        return this.exportToPDF(data, filename);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async exportAnalysisReport(
    currencies: ISO4217[],
    period: string,
    output?: string
  ): Promise<string> {
    const analysisData: any[] = [];

    for (const currency of currencies) {
      if (currency === 'SOS') continue;

      try {
        const analysis = await analyzeMarket('SOS', currency, period);
        analysisData.push({
          currency,
          baseCurrency: 'SOS',
          period,
          volatility: analysis.volatility,
          trend: analysis.trend,
          support: analysis.support,
          resistance: analysis.resistance,
          rsi: analysis.rsi,
          sma7: analysis.sma[0],
          sma14: analysis.sma[1],
          sma30: analysis.sma[2],
          ema7: analysis.ema[0],
          ema14: analysis.ema[1],
          ema30: analysis.ema[2],
          generatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.warn(`Failed to analyze ${currency}:`, error);
      }
    }

    const filename = output || `analysis-report-${period}-${Date.now()}.xlsx`;
    return this.exportToXLSX(analysisData, filename);
  }

  private async exportToCSV(data: any[], filename: string): Promise<string> {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const csvWriter = createObjectCsvWriter({
      path: filename,
      header: Object.keys(data[0]).map(key => ({ id: key, title: key }))
    });

    await csvWriter.writeRecords(data);
    console.log(`Exported ${data.length} records to ${filename}`);
    return filename;
  }

  private async exportToXLSX(data: any[], filename: string): Promise<string> {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Exchange Rates');

    // Add some formatting
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Auto-width columns
    const colWidths: any[] = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      let maxWidth = 10;
      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          maxWidth = Math.max(maxWidth, cellLength);
        }
      }
      colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    }
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, filename);
    console.log(`Exported ${data.length} records to ${filename}`);
    return filename;
  }

  private async exportToJSON(data: any[], filename: string): Promise<string> {
    const jsonData = {
      exportedAt: new Date().toISOString(),
      recordCount: data.length,
      data
    };

    await fs.writeFile(filename, JSON.stringify(jsonData, null, 2));
    console.log(`Exported ${data.length} records to ${filename}`);
    return filename;
  }

  private async exportToPDF(data: any[], filename: string): Promise<string> {
    // For PDF export, we'll create a simple HTML report and note that
    // a proper PDF library would be needed for production use
    const html = this.generateHTMLReport(data);
    const htmlFilename = filename.replace('.pdf', '.html');
    
    await fs.writeFile(htmlFilename, html);
    console.log(`Exported HTML report to ${htmlFilename} (PDF conversion requires additional library)`);
    return htmlFilename;
  }

  private generateHTMLReport(data: any[]): string {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Somali Exchange Rates Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .header { margin-bottom: 20px; }
        .summary { margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Somali Exchange Rates Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Records: ${data.length}</p>
        <p>Currencies: ${[...new Set(data.map(d => d.currency))].join(', ')}</p>
        <p>Date Range: ${data.length > 0 ? `${data[0].date} to ${data[data.length - 1].date}` : 'N/A'}</p>
    </div>
    
    <table>
        <thead>
            <tr>
                ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${data.map(row => `
                <tr>
                    ${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }

  private generateFilename(format: string, period: string, currencies: ISO4217[]): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const currencyList = currencies.slice(0, 3).join('-');
    return `exchange-rates-${currencyList}-${period}-${timestamp}.${format}`;
  }
}

// Convenience functions
let exportService: ExportService;

export async function exportRates(options: ExportOptions): Promise<string> {
  if (!exportService) {
    exportService = new ExportService();
  }
  return exportService.exportRates(options);
}

export async function exportAnalysisReport(
  currencies: ISO4217[],
  period: string,
  output?: string
): Promise<string> {
  if (!exportService) {
    exportService = new ExportService();
  }
  return exportService.exportAnalysisReport(currencies, period, output);
}

// Quick export functions for common formats
export async function exportToCSV(
  currencies: ISO4217[],
  period: string,
  output?: string
): Promise<string> {
  return exportRates({
    format: 'csv',
    currencies,
    period,
    output
  });
}

export async function exportToExcel(
  currencies: ISO4217[],
  period: string,
  output?: string
): Promise<string> {
  return exportRates({
    format: 'xlsx',
    currencies,
    period,
    output
  });
}