const SH = {
    CONTROL: 'CONTROL',
    DESC_CELL: 'C5',
    REGION_CELL: 'C6',
    SERP_BUDGET_CELL: 'C8',
    CONTACT_BUDGET_CELL: 'C9',
    INFO_BUDGET_CELL: 'C10',
};
/**
 * BUTTON 1: FIND COMPANIES
 */
function triggerButton1() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SH.CONTROL);
    if (!sheet)
        return;
    const description = sheet.getRange(SH.DESC_CELL).getValue();
    const region = sheet.getRange(SH.REGION_CELL).getValue();
    const budget = sheet.getRange(SH.SERP_BUDGET_CELL).getValue();
    if (!description) {
        SpreadsheetApp.getUi().alert('Please enter a Customer Group Description.');
        return;
    }
    // Start the Process
    CompanyDiscovery.start(description, region, budget);
}
/**
 * BUTTON 11: FIND CONTACTS
 */
function triggerButton11() {
    SpreadsheetApp.getUi().alert('Phase 1: Company Discovery must be finished first.');
}
/**
 * BUTTON 13: FIND INFO EMAILS
 */
function triggerButton13() {
    SpreadsheetApp.getUi().alert('Phase 1: Company Discovery must be finished first.');
}
/**
 * GLOBAL TRIGGER: Runs every 5 minutes
 * Checked by JobManager
 */
function checkJobStatus() {
    const job = JobManager.getCurrentJob();
    if (!job.runId)
        return;
    console.log(`Checking status for Job: ${job.type} (${job.runId})`);
    try {
        const status = ApiClient.checkApifyStatus(job.runId); // 'RUNNING', 'SUCCEEDED', 'FAILED'
        // Update UI Status (Optional - might fail if sheet closed, but try)
        updateStatusUI(job.type || '', status);
        if (status === 'SUCCEEDED') {
            JobManager.stopJob(); // Stop Polling
            // Route to Processor
            if (job.type === 'company_discovery') {
                Processing.processCompanyResults(job.runId);
            }
        }
        else if (status === 'FAILED' || status === 'ABORTED') {
            JobManager.stopJob();
            updateStatusUI(job.type || '', 'FAILED');
        }
        // If RUNNING, do nothing. Trigger runs again in 5 mins.
    }
    catch (e) {
        console.error("Polling Error:", e);
    }
}
function updateStatusUI(type, msg) {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH.CONTROL);
        if (type === 'company_discovery')
            sheet === null || sheet === void 0 ? void 0 : sheet.getRange('D17').setValue(msg);
        if (type === 'contact_discovery')
            sheet === null || sheet === void 0 ? void 0 : sheet.getRange('D21').setValue(msg);
    }
    catch (e) {
        // Ignore UI errors in background triggers
    }
}
