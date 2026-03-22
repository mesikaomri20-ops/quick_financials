const yahooFinance = require('yahoo-finance2').default;

async function test() {
  const symbol = 'AAPL';
  const quote = await yahooFinance.quote(symbol);
  const summary = await yahooFinance.quoteSummary(symbol, {
    modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics', 'incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory']
  });
  
  console.log("QUOTE KEYS:", Object.keys(quote));
  console.log("SUMMARY KEYS:", Object.keys(summary));
  if (summary.incomeStatementHistory) {
      console.log("INCOME:", summary.incomeStatementHistory.incomeStatementHistory[0]);
  }
}

test().catch(console.error);
