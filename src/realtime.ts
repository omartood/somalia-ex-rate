import { WebSocket, WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import type { ISO4217, RateTable } from './types';
import { getRates } from './index';
import * as cron from 'node-cron';

export interface RateUpdate {
  from: ISO4217;
  to: ISO4217;
  rate: number;
  previousRate?: number;
  change?: number;
  changePercent?: number;
  timestamp: string;
}

export class RateStreamServer extends EventEmitter {
  private server: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private updateTask?: cron.ScheduledTask;
  private lastRates: RateTable = {} as RateTable;

  constructor(port: number = 8080) {
    super();
    this.server = new WebSocketServer({ port });
    this.setupServer();
  }

  private setupServer(): void {
    this.server.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket client connected');
      this.clients.add(ws);

      // Send current rates to new client
      this.sendCurrentRates(ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Invalid message from client:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    console.log(`Rate stream server started on port ${this.server.options.port}`);
  }

  private handleClientMessage(ws: WebSocket, data: any): void {
    switch (data.type) {
      case 'subscribe':
        // Client wants to subscribe to specific currency pairs
        if (data.currencies && Array.isArray(data.currencies)) {
          ws.send(JSON.stringify({
            type: 'subscription_confirmed',
            currencies: data.currencies,
            timestamp: new Date().toISOString()
          }));
        }
        break;
      
      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;
    }
  }

  private async sendCurrentRates(ws: WebSocket): Promise<void> {
    try {
      const rates = await getRates();
      ws.send(JSON.stringify({
        type: 'current_rates',
        rates,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to send current rates:', error);
    }
  }

  startUpdates(interval: string = '*/1 * * * *'): void {
    if (this.updateTask) {
      this.updateTask.stop();
    }

    this.updateTask = cron.schedule(interval, async () => {
      await this.checkForUpdates();
    }, {
      scheduled: false
    });

    this.updateTask.start();
    console.log(`Started rate updates with interval: ${interval}`);
  }

  stopUpdates(): void {
    if (this.updateTask) {
      this.updateTask.stop();
      this.updateTask = undefined;
      console.log('Stopped rate updates');
    }
  }

  private async checkForUpdates(): Promise<void> {
    try {
      const newRates = await getRates();
      const updates: RateUpdate[] = [];

      // Compare with previous rates
      for (const [currency, rate] of Object.entries(newRates)) {
        const previousRate = this.lastRates[currency as ISO4217];
        
        if (previousRate && previousRate !== rate) {
          const change = rate - previousRate;
          const changePercent = (change / previousRate) * 100;

          updates.push({
            from: 'SOS',
            to: currency as ISO4217,
            rate,
            previousRate,
            change,
            changePercent,
            timestamp: new Date().toISOString()
          });
        }
      }

      if (updates.length > 0) {
        this.broadcastUpdates(updates);
        this.emit('rate-updates', updates);
      }

      this.lastRates = newRates;
    } catch (error) {
      console.error('Failed to check for rate updates:', error);
    }
  }

  private broadcastUpdates(updates: RateUpdate[]): void {
    const message = JSON.stringify({
      type: 'rate_updates',
      updates,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    console.log(`Broadcasted ${updates.length} rate updates to ${this.clients.size} clients`);
  }

  getConnectedClients(): number {
    return this.clients.size;
  }

  close(): void {
    this.stopUpdates();
    this.clients.forEach(client => client.close());
    this.server.close();
    console.log('Rate stream server closed');
  }
}

export class RateStreamClient extends EventEmitter {
  private ws?: WebSocket;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(url: string = 'ws://localhost:8080') {
    super();
    this.url = url;
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        console.log('Connected to rate stream server');
        this.reconnectAttempts = 0;
        this.emit('connected');
      });

      this.ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('Disconnected from rate stream server');
        this.emit('disconnected');
        this.attemptReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      });
    } catch (error) {
      console.error('Failed to connect to rate stream server:', error);
      this.attemptReconnect();
    }
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'current_rates':
        this.emit('current-rates', message.rates);
        break;
      
      case 'rate_updates':
        this.emit('rate-updates', message.updates);
        break;
      
      case 'subscription_confirmed':
        this.emit('subscription-confirmed', message.currencies);
        break;
      
      case 'pong':
        this.emit('pong');
        break;
    }
  }

  subscribe(currencies: ISO4217[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        currencies
      }));
    }
  }

  ping(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'ping'
      }));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('max-reconnect-attempts');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }
}

// Convenience function to create a rate stream
export function createRateStream(currencies?: ISO4217[]): RateStreamClient {
  const client = new RateStreamClient();
  
  client.on('connected', () => {
    if (currencies) {
      client.subscribe(currencies);
    }
  });

  client.connect();
  return client;
}