import * as blessed from 'blessed';
import * as contrib from 'blessed-contrib';
import { getRates } from './index';
import { getRateHistory } from './historical';
import { analyzeMarket } from './analysis';
import { listRateAlerts } from './alerts';
import { createRateStream } from './realtime';
import type { ISO4217, RateAlert } from './types';

export class ExchangeRateTUI {
  private screen: blessed.Widgets.Screen;
  private grid: any;
  private rateTable: blessed.Widgets.TableElement;
  private chartLine: any;
  private alertsList: blessed.Widgets.ListElement;
  private logBox: blessed.Widgets.LogElement;
  private statusBar: blessed.Widgets.TextElement;
  private currentRates: Record<string, number> = {};
  private selectedCurrency: ISO4217 = 'USD';

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Somali Exchange Rates Monitor'
    });

    this.setupLayout();
    this.setupEventHandlers();
    this.startDataUpdates();
  }

  private setupLayout(): void {
    // Create grid layout
    this.grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });

    // Rate table (top-left)
    this.rateTable = this.grid.set(0, 0, 6, 6, blessed.table, {
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: true,
      label: 'Exchange Rates (1 SOS = X)',
      width: '50%',
      height: '50%',
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 2,
      columnWidth: [8, 12, 10]
    });

    // Chart (top-right)
    this.chartLine = this.grid.set(0, 6, 6, 6, contrib.line, {
      style: {
        line: 'yellow',
        text: 'green',
        baseline: 'black'
      },
      xLabelPadding: 3,
      xPadding: 5,
      label: `${this.selectedCurrency}/SOS Rate History`,
      border: { type: 'line', fg: 'cyan' }
    });

    // Alerts list (bottom-left)
    this.alertsList = this.grid.set(6, 0, 4, 6, blessed.list, {
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'green',
      interactive: true,
      label: 'Active Alerts',
      border: { type: 'line', fg: 'cyan' },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        track: {
          bg: 'cyan'
        },
        style: {
          inverse: true
        }
      }
    });

    // Log box (bottom-right)
    this.logBox = this.grid.set(6, 6, 4, 6, blessed.log, {
      fg: 'green',
      selectedFg: 'green',
      label: 'Activity Log',
      border: { type: 'line', fg: 'cyan' },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        track: {
          bg: 'cyan'
        },
        style: {
          inverse: true
        }
      }
    });

    // Status bar (bottom)
    this.statusBar = this.grid.set(10, 0, 2, 12, blessed.text, {
      content: 'Press q to quit, r to refresh, c to change currency, a to view alerts',
      style: {
        fg: 'white',
        bg: 'blue'
      },
      height: 2
    });
  }

  private setupEventHandlers(): void {
    // Quit on q or Ctrl+C
    this.screen.key(['escape', 'q', 'C-c'], () => {
      return process.exit(0);
    });

    // Refresh on r
    this.screen.key(['r'], async () => {
      await this.refreshData();
    });

    // Change currency on c
    this.screen.key(['c'], () => {
      this.showCurrencySelector();
    });

    // View alerts on a
    this.screen.key(['a'], async () => {
      await this.refreshAlerts();
    });

    // Handle rate table selection
    this.rateTable.on('select', (item: any) => {
      const currency = item.content.split(' ')[0] as ISO4217;
      if (currency && currency !== 'Currency') {
        this.selectedCurrency = currency;
        this.updateChart();
        this.log(`Selected currency: ${currency}`);
      }
    });

    // Handle alerts list selection
    this.alertsList.on('select', (item: any) => {
      this.log(`Selected alert: ${item.content}`);
    });
  }

  private async startDataUpdates(): Promise<void> {
    // Initial data load
    await this.refreshData();
    await this.refreshAlerts();
    await this.updateChart();

    // Set up real-time updates
    try {
      const stream = createRateStream(['USD', 'EUR', 'GBP', 'KES', 'ETB']);
      
      stream.on('rate-updates', (updates: any[]) => {
        updates.forEach(update => {
          this.log(`Rate update: ${update.to} = ${update.rate.toFixed(6)} (${update.changePercent > 0 ? '+' : ''}${update.changePercent.toFixed(2)}%)`);
        });
        this.refreshData();
      });

      stream.on('error', (error: Error) => {
        this.log(`Stream error: ${error.message}`);
      });

      this.log('Connected to real-time rate stream');
    } catch (error) {
      this.log('Real-time stream not available, using periodic updates');
      
      // Fallback to periodic updates
      setInterval(async () => {
        await this.refreshData();
      }, 60000); // Update every minute
    }
  }

  private async refreshData(): Promise<void> {
    try {
      this.log('Refreshing exchange rates...');
      const rates = await getRates();
      this.currentRates = rates;
      this.updateRateTable(rates);
      this.log('Exchange rates updated');
    } catch (error) {
      this.log(`Error refreshing rates: ${error}`);
    }
  }

  private updateRateTable(rates: Record<string, number>): void {
    const data = [['Currency', 'Rate', 'Change']];
    
    Object.entries(rates).forEach(([currency, rate]) => {
      if (currency === 'SOS') return;
      
      const formattedRate = rate.toFixed(6);
      const change = '—'; // Would need previous rates to calculate
      data.push([currency, formattedRate, change]);
    });

    this.rateTable.setData(data);
    this.screen.render();
  }

  private async updateChart(): Promise<void> {
    try {
      this.log(`Loading chart data for ${this.selectedCurrency}...`);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const history = await getRateHistory(
        this.selectedCurrency,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const chartData = {
        title: this.selectedCurrency,
        style: { line: 'red' },
        x: history.map(h => h.date.slice(-5)), // Show MM-DD
        y: history.map(h => h.rate)
      };

      this.chartLine.setData([chartData]);
      this.chartLine.setLabel(`${this.selectedCurrency}/SOS Rate History (30 days)`);
      this.screen.render();
      
      this.log(`Chart updated for ${this.selectedCurrency}`);
    } catch (error) {
      this.log(`Error updating chart: ${error}`);
    }
  }

  private async refreshAlerts(): Promise<void> {
    try {
      const alerts = await listRateAlerts();
      const alertItems = alerts
        .filter(alert => alert.active)
        .map(alert => `${alert.from}/${alert.to} ${alert.direction} ${alert.threshold}`);
      
      this.alertsList.setItems(alertItems);
      this.screen.render();
      
      this.log(`Loaded ${alertItems.length} active alerts`);
    } catch (error) {
      this.log(`Error loading alerts: ${error}`);
    }
  }

  private showCurrencySelector(): void {
    const currencies: ISO4217[] = ['USD', 'EUR', 'GBP', 'KES', 'ETB', 'AED', 'SAR', 'TRY', 'CNY'];
    
    const list = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 20,
      height: 12,
      border: { type: 'line' },
      label: 'Select Currency',
      keys: true,
      vi: true,
      items: currencies,
      style: {
        selected: {
          bg: 'blue'
        }
      }
    });

    list.on('select', (item: any) => {
      this.selectedCurrency = item.content as ISO4217;
      this.updateChart();
      list.destroy();
      this.screen.render();
    });

    list.on('keypress', (ch: string, key: any) => {
      if (key.name === 'escape') {
        list.destroy();
        this.screen.render();
      }
    });

    list.focus();
    this.screen.render();
  }

  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.logBox.log(`[${timestamp}] ${message}`);
    this.screen.render();
  }

  public run(): void {
    this.screen.render();
    this.log('Somali Exchange Rates Monitor started');
    this.log('Press q to quit, r to refresh, c to change currency, a to view alerts');
  }
}

// Function to start the TUI
export function startTUI(): void {
  const tui = new ExchangeRateTUI();
  tui.run();
}