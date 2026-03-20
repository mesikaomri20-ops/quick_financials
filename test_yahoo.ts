import yahooFinance from 'yahoo-finance2';

async function main() {
  const data = await yahooFinance.quoteSummary('NVDA', { 
    modules: ['incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory'] 
  } as any);
  
  console.log("Income statement first:", JSON.stringify(data.incomeStatementHistory?.incomeStatementHistory?.[0], null, 2));
  console.log("Balance sheet first:", JSON.stringify(data.balanceSheetHistory?.balanceSheetStatements?.[0], null, 2));
}
main().catch(console.error);
