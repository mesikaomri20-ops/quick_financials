const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const period1 = '2023-01-01';
    const result = await yahooFinance.fundamentalsTimeSeries('GOOGL', {
      period1,
      type: 'quarterly',
      module: 'all'
    });
    console.log('Fundamentals Time Series (quarterly) Result Count:', result.length);
    if (result.length > 0) {
        console.log('Latest Quarter Sample:');
        console.log(JSON.stringify(result[result.length - 1], null, 2));
    }
  } catch (e) {
    console.error(e);
  }
}

test();
