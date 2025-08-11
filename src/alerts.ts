import type { ISO4217, RateAlert, WebhookConfig } from "./types";
import { tryReadJSON, tryWriteJSON } from "./utils";
import { getRates } from "./index";
import * as cron from "node-cron";
import * as nodemailer from "nodemailer";
import path from "node:path";
import os from "node:os";

export class AlertManager {
  private alertsPath: string;
  private webhookConfigs: WebhookConfig[] = [];
  private emailTransporter?: nodemailer.Transporter;
  private monitoringTask?: cron.ScheduledTask;

  constructor() {
    this.alertsPath = path.join(os.homedir(), ".sosx", "alerts.json");
  }

  async createAlert(alert: Omit<RateAlert, 'id' | 'createdAt'>): Promise<string> {
    const newAlert: RateAlert = {
      ...alert,
      id: this.generateId(),
      createdAt: new Date(),
      active: true
    };

    const alerts = await this.getAlerts();
    alerts.push(newAlert);
    await this.saveAlerts(alerts);

    console.log(`Created alert: ${newAlert.from}/${newAlert.to} ${newAlert.direction} ${newAlert.threshold}`);
    
    // Start monitoring if not already running
    this.startMonitoring();
    
    return newAlert.id;
  }

  async updateAlert(id: string, updates: Partial<RateAlert>): Promise<void> {
    const alerts = await this.getAlerts();
    const index = alerts.findIndex(alert => alert.id === id);
    
    if (index === -1) {
      throw new Error(`Alert with id ${id} not found`);
    }

    alerts[index] = { ...alerts[index], ...updates };
    await this.saveAlerts(alerts);
  }

  async deleteAlert(id: string): Promise<void> {
    const alerts = await this.getAlerts();
    const filtered = alerts.filter(alert => alert.id !== id);
    
    if (filtered.length === alerts.length) {
      throw new Error(`Alert with id ${id} not found`);
    }

    await this.saveAlerts(filtered);
    console.log(`Deleted alert ${id}`);
  }

  async getAlerts(): Promise<RateAlert[]> {
    const alerts = await tryReadJSON<RateAlert[]>(this.alertsPath);
    return alerts || [];
  }

  async checkAlerts(): Promise<void> {
    const alerts = await this.getAlerts();
    const activeAlerts = alerts.filter(alert => alert.active);

    if (activeAlerts.length === 0) return;

    try {
      const rates = await getRates();
      
      for (const alert of activeAlerts) {
        const currentRate = rates[alert.to] / rates[alert.from];
        const shouldTrigger = this.shouldTriggerAlert(alert, currentRate);

        if (shouldTrigger) {
          await this.triggerAlert(alert, currentRate);
        }
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  private shouldTriggerAlert(alert: RateAlert, currentRate: number): boolean {
    if (alert.direction === 'above') {
      return currentRate > alert.threshold;
    } else {
      return currentRate < alert.threshold;
    }
  }

  private async triggerAlert(alert: RateAlert, currentRate: number): Promise<void> {
    const message = `Alert triggered: ${alert.from}/${alert.to} is ${currentRate.toFixed(6)} (${alert.direction} ${alert.threshold})`;
    
    console.log(message);

    // Send webhook notification
    if (alert.webhook) {
      await this.sendWebhook(alert.webhook, {
        type: 'alert-triggered',
        alert,
        currentRate,
        message,
        timestamp: new Date().toISOString()
      });
    }

    // Send email notification
    if (alert.email && this.emailTransporter) {
      await this.sendEmail(alert.email, 'Rate Alert Triggered', message);
    }

    // Trigger webhook configs
    for (const config of this.webhookConfigs) {
      if (config.events.includes('alert-triggered') && 
          config.currencies.includes(alert.from) && 
          config.currencies.includes(alert.to)) {
        await this.sendWebhook(config.url, {
          type: 'alert-triggered',
          alert,
          currentRate,
          message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  private async sendWebhook(url: string, payload: any): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Somali-Exchange-Rates/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Webhook error:', error);
    }
  }

  private async sendEmail(to: string, subject: string, text: string): Promise<void> {
    if (!this.emailTransporter) return;

    try {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'alerts@sosx.com',
        to,
        subject,
        text
      });
    } catch (error) {
      console.error('Email error:', error);
    }
  }

  setupEmailTransporter(config: {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
  }): void {
    this.emailTransporter = nodemailer.createTransporter(config);
  }

  addWebhookConfig(config: WebhookConfig): void {
    this.webhookConfigs.push(config);
  }

  startMonitoring(interval: string = '*/5 * * * *'): void {
    if (this.monitoringTask) {
      this.monitoringTask.stop();
    }

    this.monitoringTask = cron.schedule(interval, async () => {
      await this.checkAlerts();
    }, {
      scheduled: false
    });

    this.monitoringTask.start();
    console.log(`Started alert monitoring with interval: ${interval}`);
  }

  stopMonitoring(): void {
    if (this.monitoringTask) {
      this.monitoringTask.stop();
      this.monitoringTask = undefined;
      console.log('Stopped alert monitoring');
    }
  }

  private async saveAlerts(alerts: RateAlert[]): Promise<void> {
    await tryWriteJSON(this.alertsPath, alerts);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Global alert manager instance
let alertManager: AlertManager;

export function getAlertManager(): AlertManager {
  if (!alertManager) {
    alertManager = new AlertManager();
  }
  return alertManager;
}

// Convenience functions
export async function setRateAlert(
  from: ISO4217,
  to: ISO4217,
  threshold: number,
  direction: 'above' | 'below',
  options: { webhook?: string; email?: string } = {}
): Promise<string> {
  const manager = getAlertManager();
  return manager.createAlert({
    from,
    to,
    threshold,
    direction,
    webhook: options.webhook,
    email: options.email
  });
}

export async function removeRateAlert(id: string): Promise<void> {
  const manager = getAlertManager();
  return manager.deleteAlert(id);
}

export async function listRateAlerts(): Promise<RateAlert[]> {
  const manager = getAlertManager();
  return manager.getAlerts();
}

export function startAlertMonitoring(interval?: string): void {
  const manager = getAlertManager();
  manager.startMonitoring(interval);
}

export function stopAlertMonitoring(): void {
  const manager = getAlertManager();
  manager.stopMonitoring();
}