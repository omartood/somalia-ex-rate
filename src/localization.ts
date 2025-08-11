import type { ISO4217, Language, Locale } from "./types";

interface LocalizedStrings {
  [key: string]: {
    [lang in Language]: string;
  };
}

const LOCALIZED_STRINGS: LocalizedStrings = {
  // Currency names
  'currency.SOS': {
    en: 'Somali Shilling',
    so: 'Shilin Soomaali',
    ar: 'شلن صومالي'
  },
  'currency.USD': {
    en: 'US Dollar',
    so: 'Doolar Maraykan',
    ar: 'دولار أمريكي'
  },
  'currency.EUR': {
    en: 'Euro',
    so: 'Yuuroo',
    ar: 'يورو'
  },
  'currency.GBP': {
    en: 'British Pound',
    so: 'Bownd Biritish',
    ar: 'جنيه إسترليني'
  },
  'currency.KES': {
    en: 'Kenyan Shilling',
    so: 'Shilin Kiiniya',
    ar: 'شلن كيني'
  },
  'currency.ETB': {
    en: 'Ethiopian Birr',
    so: 'Bir Itoobiya',
    ar: 'بير إثيوبي'
  },
  'currency.AED': {
    en: 'UAE Dirham',
    so: 'Dirham Imaaraadka',
    ar: 'درهم إماراتي'
  },
  'currency.SAR': {
    en: 'Saudi Riyal',
    so: 'Riyaal Sacuudi',
    ar: 'ريال سعودي'
  },
  'currency.TRY': {
    en: 'Turkish Lira',
    so: 'Lira Turki',
    ar: 'ليرة تركية'
  },
  'currency.CNY': {
    en: 'Chinese Yuan',
    so: 'Yuan Shiinaha',
    ar: 'يوان صيني'
  },

  // Currency symbols
  'symbol.SOS': {
    en: 'Sh',
    so: 'Sh',
    ar: 'ش.ص'
  },

  // Common phrases
  'exchange_rate': {
    en: 'Exchange Rate',
    so: 'Qiimaha Sarifka',
    ar: 'سعر الصرف'
  },
  'conversion': {
    en: 'Conversion',
    so: 'Beddelka',
    ar: 'التحويل'
  },
  'amount': {
    en: 'Amount',
    so: 'Qadarka',
    ar: 'المبلغ'
  },
  'from': {
    en: 'From',
    so: 'Ka',
    ar: 'من'
  },
  'to': {
    en: 'To',
    so: 'Ilaa',
    ar: 'إلى'
  },
  'equals': {
    en: 'equals',
    so: 'le\'eg yahay',
    ar: 'يساوي'
  },
  'rate_updated': {
    en: 'Rate updated',
    so: 'Qiimaha waa la cusbooneysiiyay',
    ar: 'تم تحديث السعر'
  },
  'offline_mode': {
    en: 'Offline mode',
    so: 'Hab aan internetka lahayn',
    ar: 'وضع عدم الاتصال'
  },
  'cache_used': {
    en: 'Using cached data',
    so: 'Isticmaalka xogta kaydsan',
    ar: 'استخدام البيانات المخزنة'
  },

  // Time periods
  'daily': {
    en: 'Daily',
    so: 'Maalin kasta',
    ar: 'يومي'
  },
  'weekly': {
    en: 'Weekly',
    so: 'Toddobaad kasta',
    ar: 'أسبوعي'
  },
  'monthly': {
    en: 'Monthly',
    so: 'Bil kasta',
    ar: 'شهري'
  },

  // Market analysis
  'trend.bullish': {
    en: 'Bullish',
    so: 'Kor u socda',
    ar: 'صاعد'
  },
  'trend.bearish': {
    en: 'Bearish',
    so: 'Hoos u socda',
    ar: 'هابط'
  },
  'trend.neutral': {
    en: 'Neutral',
    so: 'Dhexdhexaad',
    ar: 'محايد'
  },
  'volatility': {
    en: 'Volatility',
    so: 'Doorsooma',
    ar: 'التقلب'
  },
  'support': {
    en: 'Support',
    so: 'Taageero',
    ar: 'الدعم'
  },
  'resistance': {
    en: 'Resistance',
    so: 'Iska caabin',
    ar: 'المقاومة'
  }
};

export class LocalizationService {
  private currentLanguage: Language = 'en';
  private currentLocale: Locale = 'en-US';

  setLanguage(language: Language): void {
    this.currentLanguage = language;
  }

  setLocale(locale: Locale): void {
    this.currentLocale = locale;
    // Update language based on locale
    if (locale.startsWith('so')) {
      this.currentLanguage = 'so';
    } else if (locale.startsWith('ar')) {
      this.currentLanguage = 'ar';
    } else {
      this.currentLanguage = 'en';
    }
  }

  translate(key: string, language?: Language): string {
    const lang = language || this.currentLanguage;
    const strings = LOCALIZED_STRINGS[key];
    
    if (!strings) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    return strings[lang] || strings.en || key;
  }

  getCurrencyName(currency: ISO4217, language?: Language): string {
    return this.translate(`currency.${currency}`, language);
  }

  getCurrencySymbol(currency: ISO4217, language?: Language): string {
    const symbol = this.translate(`symbol.${currency}`, language);
    return symbol !== `symbol.${currency}` ? symbol : this.getDefaultSymbol(currency);
  }

  formatCurrency(amount: number, currency: ISO4217, options: {
    language?: Language;
    showSymbol?: boolean;
    showCode?: boolean;
  } = {}): string {
    const lang = options.language || this.currentLanguage;
    const locale = this.getLocaleForLanguage(lang);
    
    try {
      let formatted = new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: currency === 'SOS' ? 0 : 2,
        maximumFractionDigits: currency === 'SOS' ? 0 : 6
      }).format(amount);

      if (options.showSymbol !== false) {
        const symbol = this.getCurrencySymbol(currency, lang);
        formatted = `${symbol} ${formatted}`;
      }

      if (options.showCode) {
        formatted = `${formatted} ${currency}`;
      }

      return formatted;
    } catch (error) {
      // Fallback to simple formatting
      const symbol = options.showSymbol !== false ? this.getCurrencySymbol(currency, lang) : '';
      const code = options.showCode ? ` ${currency}` : '';
      return `${symbol} ${amount.toLocaleString()}${code}`.trim();
    }
  }

  formatQuote(
    amount: number,
    fromCurrency: ISO4217,
    toCurrency: ISO4217,
    convertedAmount: number,
    options: { language?: Language } = {}
  ): string {
    const lang = options.language || this.currentLanguage;
    
    const fromFormatted = this.formatCurrency(amount, fromCurrency, { language: lang });
    const toFormatted = this.formatCurrency(convertedAmount, toCurrency, { language: lang });
    const equals = this.translate('equals', lang);

    return `${fromFormatted} ${equals} ${toFormatted}`;
  }

  formatTrend(trend: 'bullish' | 'bearish' | 'neutral', language?: Language): string {
    return this.translate(`trend.${trend}`, language);
  }

  getAvailableLanguages(): { code: Language; name: string; nativeName: string }[] {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'so', name: 'Somali', nativeName: 'Soomaali' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
    ];
  }

  private getLocaleForLanguage(language: Language): string {
    switch (language) {
      case 'so': return 'so-SO';
      case 'ar': return 'ar-SA';
      default: return 'en-US';
    }
  }

  private getDefaultSymbol(currency: ISO4217): string {
    const symbols: Record<ISO4217, string> = {
      SOS: 'Sh',
      USD: '$',
      EUR: '€',
      GBP: '£',
      KES: 'KSh',
      ETB: 'Br',
      AED: 'د.إ',
      SAR: '﷼',
      TRY: '₺',
      CNY: '¥'
    };
    return symbols[currency] || currency;
  }
}

// Global localization service
let localizationService: LocalizationService;

export function getLocalizationService(): LocalizationService {
  if (!localizationService) {
    localizationService = new LocalizationService();
  }
  return localizationService;
}

// Convenience functions
export function setLanguage(language: Language): void {
  getLocalizationService().setLanguage(language);
}

export function setLocale(locale: Locale): void {
  getLocalizationService().setLocale(locale);
}

export function translate(key: string, language?: Language): string {
  return getLocalizationService().translate(key, language);
}

export function formatLocalizedCurrency(
  amount: number,
  currency: ISO4217,
  options?: { language?: Language; showSymbol?: boolean; showCode?: boolean }
): string {
  return getLocalizationService().formatCurrency(amount, currency, options);
}

export function formatLocalizedQuote(
  amount: number,
  fromCurrency: ISO4217,
  toCurrency: ISO4217,
  convertedAmount: number,
  options?: { language?: Language }
): string {
  return getLocalizationService().formatQuote(amount, fromCurrency, toCurrency, convertedAmount, options);
}