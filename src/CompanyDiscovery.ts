import { CONFIG } from './Config';
import { ApiClient } from './ApiClient';
import { JobManager } from './JobManager';

export const CompanyDiscovery = {

  start: function(description: string, region: string, budget: number) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.CONTROL);
    const statusCell = sheet?.getRange('D17');

    try {
      // 1. Get Base Keywords
      statusCell?.setValue('🧠 Generating Keywords...');
      const keywords = this.getKeywords(description);

      // 2. Get Cities
      statusCell?.setValue('🌍 Generating Cities...');
      const cities = this.getCities(region);

      // 3. Combine & Shuffle
      statusCell?.setValue('🔀 Combining Queries...');
      let allQueries: Array<{ keyword: string; city: string; query: string }> = [];
      
      keywords.forEach(kw => {
        cities.forEach(city => {
          allQueries.push({
            keyword: kw,
            city: city,
            query: `${kw} in ${city}`
          });
        });
      });

      // Randomize the list (Fisher-Yates Shuffle)
      this.shuffleArray(allQueries);

      // 4. Budget Guard
      // Assume $0.05 per search (Apify)
      const COST_PER_SEARCH = 0.05;
      const maxQueries = Math.floor(budget / COST_PER_SEARCH);
      
      let finalBatch = allQueries;
      if (allQueries.length > maxQueries) {
        console.log(`Budget Limit: Truncating from ${allQueries.length} to ${maxQueries}.`);
        finalBatch = allQueries.slice(0, maxQueries);
      }

      // 5. Log to Sheet (With new columns)
      this.logKeywords(finalBatch);

      // 6. Start Apify
      if (finalBatch.length === 0) throw new Error("No queries generated.");
      
      statusCell?.setValue('🕷️ Starting Scraper...');
      
      const input = {
        queries: finalBatch.map(x => x.query).join('\n'), // Extract just the query string
        resultsPerPage: 10,
        countryCode: this.getCountryCode(region),
        maxPagesPerQuery: 1
      };

      // FIX: Use tilde ~ instead of slash /
      const runId = ApiClient.startApifyRun('apify~google-search-scraper', input);

      JobManager.startJob('company_discovery', runId);
      statusCell?.setValue('⏳ Scraping (Check in 5m)...');

    } catch (e: any) {
      console.error(e);
      statusCell?.setValue('❌ Error');
      SpreadsheetApp.getUi().alert(`Error: ${e.message}`);
    }
  },

  /**
   * HELPER 1: Get Base Keywords
   */
  getKeywords: function(description: string): string[] {
    const prompt = `
      Context: B2B Lead Generation.
      Target Group: ${description}.
      Task: Generate 10 high-intent, short business search terms (nouns). Do not include location.
      Format: JSON Array of strings.
      Example: ["solar panel installers", "photovoltaic suppliers"]
    `;
    const json = ApiClient.callGemini(prompt);
    return JSON.parse(json);
  },

  /**
   * HELPER 2: Get Cities
   */
  getCities: function(region: string): string[] {
    // Optimization: If Region is US, maybe ask for top 50 cities.
    const prompt = `
      Task: List the top 15 business cities in: ${region}.
      Format: JSON Array of strings.
      Example: ["Berlin", "Munich", "Hamburg"]
    `;
    const json = ApiClient.callGemini(prompt);
    return JSON.parse(json);
  },

  /**
   * HELPER 3: Log to Sheet (3 Columns)
   */
  logKeywords: function(batch: any[]) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.KEYWORDS);
    if (!sheet) return;
    
    const timestamp = new Date();
    // Map to: [Timestamp, Base Keyword, City, Combined Query, Source]
    const rows = batch.map(item => [
      timestamp, 
      item.keyword, 
      item.city, 
      item.query, 
      'Gemini'
    ]);
    
    const lastRow = Math.max(sheet.getLastRow(), 1);
    sheet.getRange(lastRow + 1, 1, rows.length, 5).setValues(rows);
  },

  shuffleArray: function(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  },

  getCountryCode: function(region: string): string {
    const map: Record<string, string> = { 'US': 'us', 'UK': 'gb', 'DE': 'de', 'EU': 'us' };
    return map[region] || 'us';
  }
};