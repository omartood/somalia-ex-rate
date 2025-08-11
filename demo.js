const { getRates, convert, quote, formatSOS } = require('./dist/index.js');

async function demo() {
  console.log('🇸🇴 Somali Exchange Rates Demo\n');
  
  try {
    // Get all current rates
    console.log('📊 Current exchange rates (1 SOS in other currencies):');
    const rates = await getRates();
    Object.entries(rates).forEach(([currency, rate]) => {
      if (currency !== 'SOS') {
        console.log(`  1 SOS = ${rate.toFixed(6)} ${currency}`);
      }
    });
    
    console.log('\n💱 Currency Conversions:');
    
    // Convert 100 USD to SOS
    const usdToSos = await convert(100, 'USD', 'SOS');
    console.log(`  $100 USD = ${formatSOS(usdToSos)}`);
    
    // Convert 50000 SOS to USD
    const sosToUsd = await convert(50000, 'SOS', 'USD');
    console.log(`  Sh 50,000 SOS = $${sosToUsd.toFixed(2)} USD`);
    
    // Convert EUR to GBP via SOS
    const eurToGbp = await convert(100, 'EUR', 'GBP');
    console.log(`  €100 EUR = £${eurToGbp.toFixed(2)} GBP`);
    
    console.log('\n💬 Formatted Quotes:');
    
    // Get formatted quotes
    const quote1 = await quote('USD', 'SOS', 1);
    console.log(`  ${quote1}`);
    
    const quote2 = await quote('SOS', 'EUR', 1000);
    console.log(`  ${quote2}`);
    
    const quote3 = await quote('GBP', 'KES', 50);
    console.log(`  ${quote3}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

demo();