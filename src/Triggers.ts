import { CompanyDiscovery } from './CompanyDiscovery';
import { ContactDiscovery } from './ContactDiscovery'; // Import added
import { JobManager } from './JobManager';
import { ApiClient } from './ApiClient';
import { Processing } from './Processing';

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
  if (!sheet) return;

  const description = sheet.getRange(SH.DESC_CELL).getValue();
  const region = sheet.getRange(SH.REGION_CELL).getValue();
  const budget = sheet.getRange(SH.SERP_BUDGET_CELL).getValue();

  if (!description) {
    SpreadsheetApp.getUi().alert('Please enter a Customer Group Description.');
    return;
  }

  CompanyDiscovery.start(description, region, budget);
}

/**
 * BUTTON 11: FIND CONTACTS
 */
function triggerButton11() {
  // We activate the logic now
  ContactDiscovery.start();
}

/**
 * BUTTON 13: FIND INFO EMAILS
 */
function triggerButton13() {
  SpreadsheetApp.getUi().alert('Phase 1: Company Discovery must be finished first.');
}

/**
 * GLOBAL TRIGGER: Runs every 5 minutes
 */
function checkJobStatus() {
  const job = JobManager.getCurrentJob();
  if (!job.runId) return;

  console.log(`Checking status for Job: ${job.type} (${job.runId})`);

  try {
    // 1. APIFY CHECK
    if (job.type === 'company_discovery') {
      const status = ApiClient.checkApifyStatus(job.runId);
      updateStatusUI('company_discovery', `⏳ Apify: ${status}`);

      if (status === 'SUCCEEDED') {
        JobManager.stopJob();
        Processing.processCompanyResults(job.runId);
      } else if (status === 'FAILED' || status === 'ABORTED') {
        JobManager.stopJob();
        updateStatusUI('company_discovery', '❌ Apify Failed');
      }
    } 
    
    // 2. LEADSPICKER ROBOT CHECK
    else if (job.type === 'contact_discovery_robot') {
      const info = ApiClient.checkLeadspickerStatus();
      updateStatusUI('contact_discovery', `⏳ Robot: ${info.status}`);

      // A. Check for Failure
      if (info.status === 'active' && 
          info.last_log && 
          info.last_log.toLowerCase().includes("error")) {
        JobManager.stopJob();
        updateStatusUI('contact_discovery', '❌ Robot Error');
        throw new Error("Robot Failed: " + info.last_log);
      }

      // B. Check for Completion
      // Safety check for null start time
      if (!job.startTime) {
        console.error("Job missing start time.");
        JobManager.stopJob();
        return;
      }

      const jobStartTime = new Date(job.startTime);
      const robotRunTime = new Date(info.last_run);

      // If status is active (idle) AND the last run is newer than when we started
      if (info.status === 'active' && robotRunTime > jobStartTime) {
        JobManager.stopJob();
        Processing.processContactResults(); 
      }
    }

  } catch (e) {
    console.error("Polling Error:", e);
  }
}

/**
 * HELPER: Update Status Cells
 */
function updateStatusUI(jobType: string, msg: string) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH.CONTROL);
    if (!sheet) return;

    if (jobType === 'company_discovery') {
      sheet.getRange('D17').setValue(msg);
    } 
    else if (jobType === 'contact_discovery' || jobType === 'contact_discovery_robot') {
      sheet.getRange('D21').setValue(msg);
    }
  } catch (e) {
    console.warn("Could not update UI status", e);
  }
}