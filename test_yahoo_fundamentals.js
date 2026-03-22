const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const period1 = '2021-01-01';
    const period2 = '2025-12-31';
    const result = await yahooFinance.fundamentalsTimeSeries('GOOGL', {
      period1,
      period2,
      type: 'annual', // or 'quarterly'
      merge: true
    });
    console.log('Fundamentals Time Series Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
