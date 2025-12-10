const Processing = {
    processCompanyResults: function (runId) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(CONFIG.SHEETS.QUALIFIED);
        const controlSheet = ss.getSheetByName(CONFIG.SHEETS.CONTROL);
        const statusCell = controlSheet === null || controlSheet === void 0 ? void 0 : controlSheet.getRange('D17');
        // 0. Get User Criteria for AI
        const userCriteria = controlSheet === null || controlSheet === void 0 ? void 0 : controlSheet.getRange('C5').getValue();
        try {
            statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue('📥 Fetching Apify Data...');
            // 1. Fetch from Apify
            const runInfo = ApiClient.fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${CONFIG.API_KEYS.APIFY}`, 'get', {});
            const datasetId = JSON.parse(runInfo.getContentText()).data.defaultDatasetId;
            const pages = ApiClient.fetchApifyResults(datasetId);
            if (!pages || pages.length === 0) {
                statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue('⚠️ 0 Results Found');
                return;
            }
            // 2. Load Blacklists
            const blacklists = this.loadBlacklists();
            // 3. Process Items (With Time Guard)
            const startTime = Date.now();
            const rowsToWrite = [];
            const uniqueDomains = new Set();
            // Flatten pages into a single list of candidates first
            let candidates = [];
            pages.forEach((page) => {
                (page.organicResults || []).forEach((r) => {
                    if (r.url)
                        candidates.push(r.url);
                });
            });
            console.log(`Processing ${candidates.length} candidates...`);
            statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue(`⚙️ Processing ${candidates.length} sites...`);
            for (const url of candidates) {
                // TIME GUARD: Stop if we are close to 5 mins
                if (Date.now() - startTime > 1000 * 60 * 4.5) {
                    console.warn("⏳ Time Limit Reached. Saving current batch.");
                    break;
                }
                const domain = this.extractDomain(url);
                if (!domain || uniqueDomains.has(domain))
                    continue;
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
                statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue(`✅ Done (${rowsToWrite.length} Processed)`);
            }
            else {
                statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue('⚠️ No New Qualified Domains');
            }
        }
        catch (e) {
            console.error(e);
            statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue(`❌ Error: ${e.message}`);
        }
    },
    // ... (Keep existing extractDomain, loadBlacklists, isBlacklisted helpers) ...
    extractDomain: function (url) {
        try {
            const hostname = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
            return hostname.toLowerCase();
        }
        catch (e) {
            return null;
        }
    },
    loadBlacklists: function () {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet1 = ss.getSheetByName(CONFIG.SHEETS.BLACKLIST_1);
        const rawDomains = sheet1 ? sheet1.getDataRange().getValues() : [];
        const domains = new Set();
        rawDomains.slice(1).flat().forEach(val => {
            const str = String(val).toLowerCase().trim();
            if (!str)
                return;
            const clean = this.extractDomain(str) || str;
            domains.add(clean);
        });
        const sheet2 = ss.getSheetByName(CONFIG.SHEETS.BLACKLIST_2);
        const rawExts = sheet2 ? sheet2.getDataRange().getValues() : [];
        const extensions = rawExts.slice(1).flat().map(val => {
            let str = String(val).toLowerCase().trim();
            if (str && !str.startsWith('.'))
                str = '.' + str;
            return str;
        }).filter(x => x && x !== '.');
        return { domains, extensions };
    },
    isBlacklisted: function (domain, blacklists) {
        if (blacklists.domains.has(domain))
            return true;
        for (const ext of blacklists.extensions) {
            if (domain.endsWith(ext))
                return true;
        }
        return false;
    },
    processContactResults: function () {
        var _a, _b;
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const statusCell = (_a = ss.getSheetByName(CONFIG.SHEETS.CONTROL)) === null || _a === void 0 ? void 0 : _a.getRange('D21');
        const cSheet = ss.getSheetByName(CONFIG.SHEETS.CONTACTS);
        const qSheet = ss.getSheetByName(CONFIG.SHEETS.QUALIFIED);
        try {
            statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue('📥 Downloading People...');
            // 1. Fetch Pages (Safety Limit 50)
            const MAX_PAGES = 50;
            let page = 1;
            let allPeople = [];
            let consecutiveEmpty = 0;
            while (page <= MAX_PAGES) {
                const res = ApiClient.getProjectPeople(page);
                if (!res || res.length === 0) {
                    consecutiveEmpty++;
                    if (consecutiveEmpty >= 2)
                        break;
                }
                else {
                    consecutiveEmpty = 0;
                    allPeople = allPeople.concat(res);
                    if (res.length < 10)
                        break; // End of list
                }
                page++;
                Utilities.sleep(200);
            }
            if (allPeople.length === 0) {
                statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue('⚠️ No People Found');
                // Optional: Mark SENT_TO_ROBOT rows as NO_CONTACTS here
                return;
            }
            statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue(`⚡ Filtering ${allPeople.length} people...`);
            // 2. Filter & Map
            const contactsToWrite = [];
            const processedDomains = new Set();
            const userCriteria = ((_b = ss.getSheetByName(CONFIG.SHEETS.CONTROL)) === null || _b === void 0 ? void 0 : _b.getRange('C5').getValue()) || "Decision Maker";
            allPeople.forEach((p) => {
                // Robust Mapping
                const domain = p.domain || p.company_domain || '';
                const title = p.title || p.position || '';
                const email = p.work_email || p.email || '';
                if (!domain)
                    return;
                // Apply Hybrid Qualification
                if (Qualification.qualifyJobTitle(title, userCriteria)) {
                    contactsToWrite.push([
                        domain,
                        p.first_name || '',
                        p.last_name || '',
                        title,
                        email,
                        email ? 'Provided by LP' : 'Pending',
                        p.linkedin_url || '',
                        'Leadspicker',
                        50
                    ]);
                }
                processedDomains.add(domain);
            });
            // 3. Save
            if (contactsToWrite.length > 0) {
                if (!cSheet) {
                    statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue('❌ Error: Destination sheet not found');
                }
                else {
                    const lastRow = Math.max(cSheet.getLastRow(), 1);
                    cSheet.getRange(lastRow + 1, 1, contactsToWrite.length, 9).setValues(contactsToWrite);
                    statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue(`✅ Saved ${contactsToWrite.length} Contacts`);
                }
            }
            else {
                statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue('⚠️ Contacts found but all filtered out');
            }
            // 4. Update Status (Mark DOWNLOADED)
            if (!qSheet) {
                // Can't update status if qSheet is null
                return;
            }
            const qData = qSheet.getDataRange().getValues();
            for (let i = 1; i < qData.length; i++) {
                const rowDomain = String(qData[i][0]);
                // If we found people for this domain OR if it was sent to robot (and came back empty)
                // Mark it as processed so we don't loop forever.
                if (processedDomains.has(rowDomain)) {
                    qSheet.getRange(i + 1, 6).setValue('DOWNLOADED');
                }
                else if (String(qData[i][5]) === 'SENT_TO_ROBOT') {
                    qSheet.getRange(i + 1, 6).setValue('NO CONTACTS FOUND');
                }
            }
        }
        catch (e) {
            console.error(e);
            statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue(`❌ Error: ${e.message}`);
        }
    }
};
