const ApiClient = {
    /**
     * 1. GOOGLE GEMINI (AI)
     * Uses REST API (no library needed in GAS).
     */
    callGemini: function (prompt) {
        var _a, _b, _c, _d, _e;
        const key = CONFIG.API_KEYS.GEMINI;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`;
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" } // Force JSON output
        };
        const response = this.fetch(url, 'post', payload);
        const json = JSON.parse(response.getContentText());
        // Extract text from the deep JSON structure
        const text = (_e = (_d = (_c = (_b = (_a = json.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
        if (!text)
            throw new Error(`Gemini Error: No content generated. ${JSON.stringify(json)}`);
        return text;
    },
    /**
     * 2. APIFY (Scraping)
     */
    startApifyRun: function (actorId, input) {
        const token = CONFIG.API_KEYS.APIFY;
        // Start run and return immediately (timeout=0)
        const url = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}&timeout=0`;
        const response = this.fetch(url, 'post', input);
        const json = JSON.parse(response.getContentText());
        return json.data.id; // Return Run ID
    },
    checkApifyStatus: function (runId) {
        const token = CONFIG.API_KEYS.APIFY;
        const url = `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`;
        const response = this.fetch(url, 'get');
        const json = JSON.parse(response.getContentText());
        return json.data.status; // 'RUNNING', 'SUCCEEDED', 'FAILED'
    },
    fetchApifyResults: function (datasetId) {
        const token = CONFIG.API_KEYS.APIFY;
        const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&format=json`;
        const response = this.fetch(url, 'get');
        return JSON.parse(response.getContentText());
    },
    /**
     * 3. LEADSPICKER (People Search)
     */
    findPeopleLeadspicker: function (domain, limit = 20) {
        const key = CONFIG.API_KEYS.LEADSPICKER;
        const url = `https://api.leadspicker.com/v1/people/search`; // Check docs for exact endpoint
        // Note: Actual endpoint might differ based on LP version.
        // Using standard pattern. 
        const payload = {
            domain: domain,
            limit: limit,
            api_key: key
        };
        const response = this.fetch(url, 'post', payload);
        const json = JSON.parse(response.getContentText());
        return json.data || [];
    },
    /**
     * 4. SNOV.IO (Verification)
     */
    /* verifyEmailSnovio: function(email: string): any {
      const key = CONFIG.API_KEYS.SNOVIO;
      // Snov.io requires key/secret usually, or access token.
      // Assuming API Key auth for simplicity, check docs if OAuth needed.
      // Standard endpoint:
      const url = `https://api.snov.io/v1/verify-email?email=${email}&access_token=${key}`;
      
      const response = this._fetch(url, 'post'); // Snovio sometimes uses POST for verify
      return JSON.parse(response.getContentText());
    },
   */
    /**
     * INTERNAL HELPER: Generic Fetch with Error Handling
     */
    fetch: function (url, method, payload) {
        const options = {
            method: method,
            muteHttpExceptions: true,
            contentType: 'application/json'
        };
        if (payload) {
            options.payload = JSON.stringify(payload);
        }
        const response = UrlFetchApp.fetch(url, options);
        const code = response.getResponseCode();
        if (code >= 400) {
            throw new Error(`API Request Failed (${code}): ${response.getContentText()}`);
        }
        return response;
    }
};
