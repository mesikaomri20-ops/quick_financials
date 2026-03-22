const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

function rowLabel(row, period) {
  if (!row.date) return "N/A";
  const date = new Date(row.date);
  const year = date.getFullYear().toString();
  
  if (period === "quarter") {
    let q = row.period ? String(row.period) : "";
    if (!q.startsWith("Q")) {
        const month = date.getMonth();
        q = `Q${Math.floor(month / 3) + 1}`;
    }
    return `${q} ${year}`;
  }
  return year;
}

const mergeModules = (income, balance, cashflow, isQuarterly) => {
    const map = new Map();
    const process = (arr) => arr?.forEach(item => {
        const d = item.endDate || item.date;
        if (!d) return;
        const key = new Date(d).toISOString().split('T')[0];
        map.set(key, { ...map.get(key), ...item });
    });
    process(income); process(balance); process(cashflow);
    
    return Array.from(map.values())
        .map(item => {
            const d = item.endDate || item.date;
            const rev = item.totalRevenue || item.operatingRevenue || 0;
            const gp = item.grossProfit ?? (rev - (item.costOfRevenue || 0));
            const fcf = item.freeCashFlow ?? ((item.totalCashFromOperatingActivities || 0) + (item.capitalExpenditures || 0));
            
            return {
                year: rowLabel({ date: d }, isQuarterly ? "quarter" : "annual"),
                revenue: rev,
                grossProfit: gp,
                operatingIncome: item.operatingIncome || 0,
                netIncome: item.netIncome || item.netIncomeCommonStockholders || 0,
                researchAndDevelopment: item.researchAndDevelopment || 0,
                totalAssets: item.totalAssets || 0,
                totalLiabilities: item.totalLiabilities || (item.totalAssets - (item.totalStockholderEquity || 0)),
                totalEquity: item.totalStockholderEquity || 0,
                cash: item.cash || item.cashAndCashEquivalents || 0,
                debt: item.longTermDebt || item.totalDebt || 0,
                freeCashFlow: fcf,
                operatingCashFlow: item.totalCashFromOperatingActivities || 0,
                retainedEarnings: item.retainedEarnings || 0,
                rawDate: new Date(d)
            };
        })
        .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
};

async function test() {
  try {
    const symbol = 'AAPL';
    const modules = [
        'incomeStatementHistory',
        'incomeStatementHistoryQuarterly',
        'balanceSheetHistory',
        'balanceSheetHistoryQuarterly',
        'cashflowStatementHistory',
        'cashflowStatementHistoryQuarterly'
    ];
    console.log(`Fetching 6 modules for ${symbol}...`);
    const stats = await yahooFinance.quoteSummary(symbol, { modules });
    
    const ish = stats.incomeStatementHistory?.incomeStatementHistory || [];
    const ishQ = stats.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
    const bsh = stats.balanceSheetHistory?.balanceSheetStatements || [];
    const bshQ = stats.balanceSheetHistoryQuarterly?.balanceSheetStatements || [];
    const cfh = stats.cashflowStatementHistory?.cashflowStatements || [];
    const cfhQ = stats.cashflowStatementHistoryQuarterly?.cashflowStatements || [];

    const annualData = mergeModules(ish, bsh, cfh, false);
    const quarterlyData = mergeModules(ishQ, bshQ, cfhQ, true);

    console.log(`\nAnnual Data Points: ${annualData.length}`);
    if (annualData.length > 0) {
        console.log('Oldest:', annualData[0].year);
        console.log('Newest:', annualData[annualData.length-1].year);
    }

    console.log(`\nQuarterly Data Points: ${quarterlyData.length}`);
    if (quarterlyData.length > 0) {
        console.log('Oldest:', quarterlyData[0].year);
        console.log('Newest:', quarterlyData[quarterlyData.length-1].year);
        console.log('Sample data keys:', Object.keys(quarterlyData[0]));
    }
  } catch (e) {
    console.error(e);
  }
}

test();
