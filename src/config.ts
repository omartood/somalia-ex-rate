import type { UserConfig, Language, Locale, ISO4217, DatabaseConfig } from './types';
import { tryReadJSON, tryWriteJSON } from './utils';
import path from 'node:path';
import os from 'node:os';

const DEFAULT_CONFIG: UserConfig = {
  defaultCurrencies: ['USD', 'EUR', 'GBP', 'KES', 'ETB'],
  language: 'en',
  locale: 'en-US',
  notifications: {},
  providers: {
    primary: 'exchangerate-host',
    fallbacks: ['fixer', 'currencyapi']
  }
};

export class ConfigManager {
  private configPath: string;
  private config: UserConfig;

  constructor() {
    this.configPath = path.join(os.homedir(), '.sosx', 'config.json');
    this.config = { ...DEFAULT_CONFIG };
  }

  async loadConfig(): Promise<UserConfig> {
    try {
      const savedConfig = await tryReadJSON<UserConfig>(this.configPath);
      if (savedConfig) {
        this.config = { ...DEFAULT_CONFIG, ...savedConfig };
      }
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
    }
    return this.config;
  }

  async saveConfig(): Promise<void> {
    await tryWriteJSON(this.configPath, this.config);
    console.log(`Configuration saved to ${this.configPath}`);
  }

  getConfig(): UserConfig {
    return { ...this.config };
  }

  // Language and Locale
  setLanguage(language: Language): void {
    this.config.language = language;
    // Update locale to match language
    switch (language) {
      case 'so':
        this.config.locale = 'so-SO';
        break;
      case 'ar':
        this.config.locale = 'ar-SA';
        break;
      default:
        this.config.locale = 'en-US';
    }
  }

  setLocale(locale: Locale): void {
    this.config.locale = locale;
  }

  getLanguage(): Language {
    return this.config.language;
  }

  getLocale(): Locale {
    return this.config.locale;
  }

  // Default Currencies
  setDefaultCurrencies(currencies: ISO4217[]): void {
    this.config.defaultCurrencies = currencies;
  }

  addDefaultCurrency(currency: ISO4217): void {
    if (!this.config.defaultCurrencies.includes(currency)) {
      this.config.defaultCurrencies.push(currency);
    }
  }

  removeDefaultCurrency(currency: ISO4217): void {
    this.config.defaultCurrencies = this.config.defaultCurrencies.filter(c => c !== currency);
  }

  getDefaultCurrencies(): ISO4217[] {
    return [...this.config.defaultCurrencies];
  }

  // Notifications
  setEmailNotification(email: string): void {
    this.config.notifications.email = email;
  }

  setWebhookNotification(webhook: string): void {
    this.config.notifications.webhook = webhook;
  }

  removeEmailNotification(): void {
    delete this.config.notifications.email;
  }

  removeWebhookNotification(): void {
    delete this.config.notifications.webhook;
  }

  getNotificationSettings(): { email?: string; webhook?: string } {
    return { ...this.config.notifications };
  }

  // Providers
  setPrimaryProvider(provider: string): void {
    this.config.providers.primary = provider;
  }

  setFallbackProviders(providers: string[]): void {
    this.config.providers.fallbacks = providers;
  }

  addFallbackProvider(provider: string): void {
    if (!this.config.providers.fallbacks.includes(provider)) {
      this.config.providers.fallbacks.push(provider);
    }
  }

  removeFallbackProvider(provider: string): void {
    this.config.providers.fallbacks = this.config.providers.fallbacks.filter(p => p !== provider);
  }

  getProviderSettings(): { primary: string; fallbacks: string[] } {
    return { ...this.config.providers };
  }

  // Database
  setDatabaseConfig(config: DatabaseConfig): void {
    this.config.database = config;
  }

  removeDatabaseConfig(): void {
    delete this.config.database;
  }

  getDatabaseConfig(): DatabaseConfig | undefined {
    return this.config.database ? { ...this.config.database } : undefined;
  }

  // Validation
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate currencies
    const validCurrencies: ISO4217[] = ['SOS', 'USD', 'EUR', 'GBP', 'KES', 'ETB', 'AED', 'SAR', 'TRY', 'CNY'];
    for (const currency of this.config.defaultCurrencies) {
      if (!validCurrencies.includes(currency)) {
        errors.push(`Invalid currency: ${currency}`);
      }
    }

    // Validate language
    const validLanguages: Language[] = ['en', 'so', 'ar'];
    if (!validLanguages.includes(this.config.language)) {
      errors.push(`Invalid language: ${this.config.language}`);
    }

    // Validate locale
    const validLocales: Locale[] = ['en-US', 'so-SO', 'ar-SA'];
    if (!validLocales.includes(this.config.locale)) {
      errors.push(`Invalid locale: ${this.config.locale}`);
    }

    // Validate email format
    if (this.config.notifications.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.config.notifications.email)) {
        errors.push(`Invalid email format: ${this.config.notifications.email}`);
      }
    }

    // Validate webhook URL
    if (this.config.notifications.webhook) {
      try {
        new URL(this.config.notifications.webhook);
      } catch {
        errors.push(`Invalid webhook URL: ${this.config.notifications.webhook}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  // Export/Import
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  importConfig(configJson: string): void {
    try {
      const importedConfig = JSON.parse(configJson) as UserConfig;
      this.config = { ...DEFAULT_CONFIG, ...importedConfig };
      
      const validation = this.validateConfig();
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }
}

// Global config manager
let configManager: ConfigManager;

export function getConfigManager(): ConfigManager {
  if (!configManager) {
    configManager = new ConfigManager();
  }
  return configManager;
}

// Convenience functions
export async function loadUserConfig(): Promise<UserConfig> {
  return getConfigManager().loadConfig();
}

export async function saveUserConfig(): Promise<void> {
  return getConfigManager().saveConfig();
}

export function getUserConfig(): UserConfig {
  return getConfigManager().getConfig();
}

export function setUserLanguage(language: Language): void {
  getConfigManager().setLanguage(language);
}

export function setUserDefaultCurrencies(currencies: ISO4217[]): void {
  getConfigManager().setDefaultCurrencies(currencies);
}

export function setUserNotifications(email?: string, webhook?: string): void {
  const manager = getConfigManager();
  if (email) manager.setEmailNotification(email);
  if (webhook) manager.setWebhookNotification(webhook);
}

// Configuration wizard for first-time setup
export async function runConfigWizard(): Promise<void> {
  const manager = getConfigManager();
  
  console.log('🔧 Somali Exchange Rates Configuration Wizard');
  console.log('This will help you set up your preferences.\n');

  // For now, we'll set up some sensible defaults
  // In a real CLI, this would prompt the user for input
  
  manager.setLanguage('en');
  manager.setDefaultCurrencies(['USD', 'EUR', 'GBP', 'KES', 'ETB']);
  manager.setPrimaryProvider('exchangerate-host');
  manager.setFallbackProviders(['fixer', 'currencyapi']);

  await manager.saveConfig();
  console.log('✅ Configuration saved successfully!');
  console.log(`Configuration file: ${manager['configPath']}`);
}