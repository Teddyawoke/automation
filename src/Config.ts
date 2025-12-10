/**
 * Config.ts
 * Type-safe central configuration.
 */

// Define the shape of our API Keys
interface ApiKeys {
    GEMINI: string | null;
    APIFY: string | null;
    LEADSPICKER: string | null;
  //  SNOVIO: string | null;
  }
  
  // Define the shape of Retry Config
  interface RetryConfig {
    MAX_ATTEMPTS: number;
    DELAY_MS: number;
  }
  
 export const CONFIG = {
    // 1. Secrets (Typed Getter)
    get API_KEYS(): ApiKeys {
      const props = PropertiesService.getScriptProperties();
      return {
        GEMINI: props.getProperty('GEMINI_API_KEY'),
        APIFY: props.getProperty('APIFY_API_TOKEN'),
        LEADSPICKER: props.getProperty('LEADSPICKER_API_KEY'),
      //  SNOVIO: props.getProperty('SNOVIO_API_KEY')
      };
    },
  
    // 2. Sheet Tab Names
    SHEETS: {
      CONTROL: 'CONTROL',
      KEYWORDS: 'KEYWORDS',
      UNIQUE: 'UNIQUE DOMAINS',
      QUALIFIED: 'QUALIFICATION RESULT',
      CONTACTS: 'CONTACTS',
      LOGS: 'LOGS',
      COSTS: 'COST_LOG',
      PROMPT: 'PROMPT',
      BLACKLIST_1: "BLACKLIST_1",
      BLACKLIST_2: "BLACKLIST_2"
    },
  
    // 3. System Limits
    MAX_RUNTIME_MS: 1000 * 60 * 4.5, // 4.5 Minutes
    LEADSPICKER: {
      PROJECT_ID: 25644,
      ROBOT_ID: 1018377,
      BASE_URL: "https://app.leadspicker.com" // Verified based on docs
    },
    RETRY: {
      MAX_ATTEMPTS: 3,
      DELAY_MS: 2000
    } as RetryConfig
  };
  
  /**
   * VALIDATION HELPER
   * Run this to verify keys are readable.
   */
  function validateConfig(): void {
    const keys = CONFIG.API_KEYS;
    const missing: string[] = [];
    
    console.log("🔍 Checking Script Properties...");
  
    if (!keys.GEMINI) missing.push('GEMINI_API_KEY');
    if (!keys.APIFY) missing.push('APIFY_API_TOKEN');
    if (!keys.LEADSPICKER) missing.push('LEADSPICKER_API_KEY');
    // if (!keys.SNOVIO) missing.push('SNOVIO_API_KEY');
    
    if (missing.length > 0) {
      const msg = `❌ CRITICAL ERROR: Missing Script Properties: ${missing.join(', ')}.`;
      console.error(msg);
      SpreadsheetApp.getUi().alert(msg);
    } else {
      const msg = "✅ SUCCESS: All API Keys found. Configuration is valid.";
      console.log(msg);
      SpreadsheetApp.getUi().alert(msg);
    }
  }

  