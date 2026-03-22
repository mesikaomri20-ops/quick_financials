const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const symbol = 'AAPL';
    console.log(`Fetching fundamentalsTimeSeries for ${symbol}...`);
    const annualRes = await yahooFinance.fundamentalsTimeSeries(symbol, {
      module: 'all',
      type: 'annual',
      period1: '2000-01-01'
    });
    const quarterlyRes = await yahooFinance.fundamentalsTimeSeries(symbol, {
      module: 'all',
      type: 'quarterly',
      period1: '2000-01-01'
    });
    
    console.log(`\nAnnual Data Points: ${annualRes.length}`);
    if (annualRes.length > 0) {
        console.log('Oldest:', annualRes[0].date);
        console.log('Newest:', annualRes[annualRes.length-1].date);
    }

    console.log(`\nQuarterly Data Points: ${quarterlyRes.length}`);
    if (quarterlyRes.length > 0) {
        console.log('Oldest:', quarterlyRes[0].date);
        console.log('Newest:', quarterlyRes[quarterlyRes.length-1].date);
    }
  } catch (e) {
    console.error(e);
  }
}

test();
