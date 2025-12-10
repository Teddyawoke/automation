import { CONFIG } from './Config';

/**
 * JobManager.ts
 * Manages the state of long-running jobs (Polling).
 * Handles: Starting, Saving State, Waking Up, and Stopping.
 */

const PROPS = {
  JOB_ID: 'CURRENT_JOB_ID',
  JOB_TYPE: 'CURRENT_JOB_TYPE',
  START_TIME: 'CURRENT_START_TIME'
};

export const JobManager = {

  /**
   * START: Saves state and sets the alarm clock.
   */
  startJob: function(jobType: string, runId: string) {
    const props = PropertiesService.getScriptProperties();
    
    // Save Context
    props.setProperty(PROPS.JOB_ID, runId);
    props.setProperty(PROPS.JOB_TYPE, jobType);
    props.setProperty(PROPS.START_TIME, new Date().toISOString());

    // Create Polling Trigger (Wake up every 5 mins)
    // First, clear old triggers to be safe
    this.clearTriggers();
    
    ScriptApp.newTrigger('checkJobStatus') // This function must be global in Triggers.ts
      .timeBased()
      .everyMinutes(5)
      .create();
      
    Logger.log(`Job Started: ${jobType} (ID: ${runId})`);
  },

  /**
   * GET STATE: Reads current job info.
   */
  getCurrentJob: function() {
    const props = PropertiesService.getScriptProperties();
    return {
      runId: props.getProperty(PROPS.JOB_ID),
      type: props.getProperty(PROPS.JOB_TYPE),
      startTime: props.getProperty(PROPS.START_TIME) // Return this
    };
  },

  /**
   * STOP: Cleans up everything.
   */
  stopJob: function() {
    this.clearTriggers();
    
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty(PROPS.JOB_ID);
    props.deleteProperty(PROPS.JOB_TYPE);
    props.deleteProperty(PROPS.START_TIME);
    
    Logger.log('Job Stopped & Triggers Cleared.');
  },

  /**
   * HELPER: Delete all triggers for this script.
   */
  clearTriggers: function() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => ScriptApp.deleteTrigger(t));
  }
};