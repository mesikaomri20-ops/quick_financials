const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const period1 = '2021-01-01';
    // period2 defaults to now
    const result = await yahooFinance.fundamentalsTimeSeries('GOOGL', {
      period1,
      type: 'annual',
      module: 'all'
    });
    console.log('Fundamentals Time Series (all) Result Count:', result.length);
    if (result.length > 0) {
        console.log('Latest Year Sample:');
        console.log(JSON.stringify(result[result.length - 1], null, 2));
    }
  } catch (e) {
    console.error(e);
  }
}

test();
