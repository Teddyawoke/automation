/**
 * Setup.ts
 * Run 'setupSheetArchitecture' once to initialize the spreadsheet structure.
 */
const DEFAULT_PROMPTS = [
    ['KEYWORD_GENERATION_PROMPT', 'System Instruction: You are a B2B Lead Generation Expert. Context: The user wants to find companies in a specific region. Task: Generate exactly 15 high-intent B2B search keywords based on the Customer Group Description. Output: JSON Array of strings.'],
    ['JOB_TITLE_QUALIFICATION_PROMPT', 'System Instruction: You are a HR Data Analyst. Task: Determine if the Candidate Job Title fits the target authority level and function. Output: JSON {match: "YES" or "NO"}.'],
    ['COMPANY_QUALIFICATION_CRITERIA', 'System Instruction: You are a Market Research Analyst. Task: Determine if the company meta-data fits the User Customer Group. Output: JSON {match: "YES" or "NO", summary: string}.'],
    ['CITY_GENERATION_PROMPT', 'System Instruction: Generate the top 250 business cities for the specified Region. Output: JSON Array of strings.']
];
function setupSheetArchitecture() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // 1. Create All Tabs defined in Config
    Object.values(CONFIG.SHEETS).forEach(tabName => {
        const sheetName = String(tabName); // Ensure tabName is a string
        let sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
            sheet = ss.insertSheet(sheetName);
        }
        // We don't clear everything to avoid deleting user data, 
        // but strictly speaking for setup we could. 
        // Let's just ensure headers exist.
    });
    // 2. Setup CONTROL Tab
    setupControlTab(ss);
    // 3. Setup PROMPT Tab
    setupPromptTab(ss);
    // 4. Setup Result Tabs (Headers)
    setupHeaders(ss.getSheetByName(CONFIG.SHEETS.KEYWORDS), ['Timestamp', 'Base Keyword', 'City', 'Combined Query', 'Source']);
    setupHeaders(ss.getSheetByName(CONFIG.SHEETS.UNIQUE), ['Domain', 'Source', 'Date Found', 'Meta Title', 'Meta Description']);
    setupHeaders(ss.getSheetByName(CONFIG.SHEETS.QUALIFIED), ['Domain', 'Website Summary', 'Qualification Reason', 'Confidence', 'Status']);
    setupHeaders(ss.getSheetByName(CONFIG.SHEETS.CONTACTS), ['Domain', 'First Name', 'Last Name', 'Job Title', 'Email', 'Verification Status', 'LinkedIn URL', 'Source', 'Score']);
    setupHeaders(ss.getSheetByName(CONFIG.SHEETS.LOGS), ['Timestamp', 'Job ID', 'Level', 'Message']);
    setupHeaders(ss.getSheetByName(CONFIG.SHEETS.COSTS), ['Timestamp', 'Job ID', 'Service', 'Action', 'Units', 'Cost ($)']);
    setupHeaders(ss.getSheetByName(CONFIG.SHEETS.BLACKLIST_1), ['Excluded Domains']);
    setupHeaders(ss.getSheetByName(CONFIG.SHEETS.BLACKLIST_2), ['Excluded Extensions']);
    // 5. Hide System Tabs
    const hiddenTabs = [CONFIG.SHEETS.PROMPT, CONFIG.SHEETS.LOGS, CONFIG.SHEETS.COSTS, CONFIG.SHEETS.BLACKLIST_2, CONFIG.SHEETS.BLACKLIST_1];
    hiddenTabs.forEach(name => {
        const s = ss.getSheetByName(name);
        if (s)
            s.hideSheet();
    });
    Logger.log('✅ Sheet Architecture Setup Complete');
}
function setupControlTab(ss) {
    const sheet = ss.getSheetByName(CONFIG.SHEETS.CONTROL);
    if (!sheet)
        return;
    sheet.clear(); // Reset Control tab layout
    // Styling
    sheet.getRange('B2').setValue('🚀 B2B LEAD GEN AUTOMATION').setFontSize(14).setFontWeight('bold');
    sheet.getRange('B4').setValue('1. SETUP').setFontWeight('bold').setFontColor('#666666');
    // Inputs
    const inputs = [
        { label: 'Customer Group Description:', cell: 'B5', input: 'C5', val: '' },
        { label: 'Region:', cell: 'B6', input: 'C6', val: 'EU' },
        { label: 'SERP Budget ($):', cell: 'B8', input: 'C8', val: 5 },
        { label: 'Contact Budget ($):', cell: 'B9', input: 'C9', val: 10 },
        { label: 'Info Budget ($):', cell: 'B10', input: 'C10', val: 2 }
    ];
    inputs.forEach(item => {
        sheet.getRange(item.cell).setValue(item.label).setFontWeight('bold');
        const inputCell = sheet.getRange(item.input);
        inputCell.setValue(item.val).setBackground('#fff2cc');
    });
    // Region Validation
    const regionRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['EU', 'US', 'UK', 'DACH', 'GLOBAL'], true)
        .build();
    sheet.getRange('C6').setDataValidation(regionRule);
    // Status Section
    sheet.getRange('B16').setValue('2. ACTIONS & STATUS').setFontWeight('bold').setFontColor('#666666');
    // Status Cells
    sheet.getRange('C17').setValue('Button 1 Status:').setFontStyle('italic');
    sheet.getRange('D17').setValue('Ready').setFontColor('grey').setHorizontalAlignment('center');
    sheet.getRange('C21').setValue('Button 11 Status:').setFontStyle('italic');
    sheet.getRange('D21').setValue('Ready').setFontColor('grey').setHorizontalAlignment('center');
    sheet.getRange('C25').setValue('Button 13 Status:').setFontStyle('italic');
    sheet.getRange('D25').setValue('Ready').setFontColor('grey').setHorizontalAlignment('center');
    // Adjust Widths
    sheet.setColumnWidth(1, 20);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 400);
}
function setupPromptTab(ss) {
    const sheet = ss.getSheetByName(CONFIG.SHEETS.PROMPT);
    if (sheet && sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, DEFAULT_PROMPTS.length, 2).setValues(DEFAULT_PROMPTS);
    }
}
function setupHeaders(sheet, headers) {
    if (sheet && sheet.getLastRow() === 0) {
        const range = sheet.getRange(1, 1, 1, headers.length);
        range.setValues([headers]);
        range.setFontWeight('bold');
        range.setBackground('#efefef');
        sheet.setFrozenRows(1);
    }
}
