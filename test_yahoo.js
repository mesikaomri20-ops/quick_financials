const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const summary = await yahooFinance.quoteSummary('GOOGL', {
      modules: ['incomeStatementHistory', 'cashflowStatementHistory']
    });
    console.log('Income Statement History Sample:');
    if (summary.incomeStatementHistory && summary.incomeStatementHistory.incomeStatementHistory) {
        console.log(JSON.stringify(summary.incomeStatementHistory.incomeStatementHistory[0], null, 2));
    } else {
        console.log('No incomeStatementHistory found');
    }
    
    console.log('\nCashflow Statement History Sample:');
    if (summary.cashflowStatementHistory && summary.cashflowStatementHistory.cashflowStatements) {
        console.log(JSON.stringify(summary.cashflowStatementHistory.cashflowStatements[0], null, 2));
    } else {
        console.log('No cashflowStatements found');
    }
  } catch (e) {
    console.error(e);
  }
}

test();
