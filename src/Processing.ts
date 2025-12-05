import { CONFIG } from './Config';
import { ApiClient } from './ApiClient';
import { MetaScraper } from './MetaScraper';
import { Qualification } from './Qualification';

export const Processing = {

  processCompanyResults: function(runId: string) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.QUALIFIED);
    const controlSheet = ss.getSheetByName(CONFIG.SHEETS.CONTROL);
    const statusCell = controlSheet?.getRange('D17');
    
    // 0. Get User Criteria for AI
    const userCriteria = controlSheet?.getRange('C5').getValue();

    try {
      statusCell?.setValue('📥 Fetching Apify Data...');
      
      // 1. Fetch from Apify
      const runInfo = ApiClient.fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${CONFIG.API_KEYS.APIFY}`, 'get');
      const datasetId = JSON.parse(runInfo.getContentText()).data.defaultDatasetId;
      const pages = ApiClient.fetchApifyResults(datasetId);

      if (!pages || pages.length === 0) {
        statusCell?.setValue('⚠️ 0 Results Found');
        return;
      }

      // 2. Load Blacklists
      const blacklists = this.loadBlacklists();

      // 3. Process Items (With Time Guard)
      const startTime = Date.now();
      const rowsToWrite: any[] = [];
      const uniqueDomains = new Set();
      
      // Flatten pages into a single list of candidates first
      let candidates: string[] = [];
      pages.forEach((page: any) => {
        (page.organicResults || []).forEach((r: any) => {
           if(r.url) candidates.push(r.url);
        });
      });

      console.log(`Processing ${candidates.length} candidates...`);
      statusCell?.setValue(`⚙️ Processing ${candidates.length} sites...`);

      for (const url of candidates) {
        // TIME GUARD: Stop if we are close to 5 mins
        if (Date.now() - startTime > 1000 * 60 * 4.5) {
          console.warn("⏳ Time Limit Reached. Saving current batch.");
          break; 
        }

        const domain = this.extractDomain(url);
        if (!domain || uniqueDomains.has(domain)) continue;
        
        // A. Blacklist Check
        if (this.isBlacklisted(domain, blacklists)) {
          console.log(`🚫 Blacklisted: ${domain}`);
          continue;
        }

        uniqueDomains.add(domain);

        // B. Meta Scrape
        const meta = MetaScraper.scrape(domain);
        
        // C. AI Qualification
        const quality = Qualification.qualifyCompany(domain, meta, userCriteria);

        // D. Prepare Row
        // [Domain, Website Summary, Qualification Reason, Confidence, Status]
        const summary = `${meta.title} \n ${meta.description}`.substring(0, 500); // Truncate for sheet
        
        rowsToWrite.push([
          domain,
          summary,
          quality.reason,
          quality.confidence,
          quality.match // Status: YES or NO
        ]);
        
        // Slight delay to be nice to APIs
        Utilities.sleep(500);
      }

      // 4. Save to Sheet
      if (sheet && rowsToWrite.length > 0) {
        const lastRow = Math.max(sheet.getLastRow(), 1);
        sheet.getRange(lastRow + 1, 1, rowsToWrite.length, 5).setValues(rowsToWrite);
        statusCell?.setValue(`✅ Done (${rowsToWrite.length} Processed)`);
      } else {
        statusCell?.setValue('⚠️ No New Qualified Domains');
      }

    } catch (e: any) {
      console.error(e);
      statusCell?.setValue(`❌ Error: ${e.message}`);
    }
  },

  // ... (Keep existing extractDomain, loadBlacklists, isBlacklisted helpers) ...
  extractDomain: function(url: string): string | null {
    try {
      const hostname = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
      return hostname.toLowerCase();
    } catch (e) { return null; }
  },

  loadBlacklists: function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet1 = ss.getSheetByName(CONFIG.SHEETS.BLACKLIST_1); 
    const rawDomains = sheet1 ? sheet1.getDataRange().getValues() : [];
    const domains = new Set();
    rawDomains.slice(1).flat().forEach(val => {
      const str = String(val).toLowerCase().trim();
      if (!str) return;
      const clean = this.extractDomain(str) || str;
      domains.add(clean);
    });

    const sheet2 = ss.getSheetByName(CONFIG.SHEETS.BLACKLIST_2);
    const rawExts = sheet2 ? sheet2.getDataRange().getValues() : [];
    const extensions = rawExts.slice(1).flat().map(val => {
      let str = String(val).toLowerCase().trim();
      if (str && !str.startsWith('.')) str = '.' + str;
      return str;
    }).filter(x => x && x !== '.');

    return { domains, extensions };
  },

  isBlacklisted: function(domain: string, blacklists: { domains: Set<unknown>, extensions: string[] }): boolean {
    if (blacklists.domains.has(domain)) return true;
    for (const ext of blacklists.extensions) {
      if (domain.endsWith(ext)) return true;
    }
    return false;
  }
};