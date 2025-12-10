const ApiClient = {
    /**
     * 1. GOOGLE GEMINI (AI)
     */
    callGemini: function (prompt) {
        var _a, _b, _c, _d, _e;
        const key = CONFIG.API_KEYS.GEMINI;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
        };
        const response = this.fetch(url, 'post', payload);
        const json = JSON.parse(response.getContentText());
        const text = (_e = (_d = (_c = (_b = (_a = json.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
        if (!text)
            throw new Error(`Gemini Error: No content. ${JSON.stringify(json)}`);
        return text;
    },
    /**
     * 2. APIFY (Scraping)
     */
    startApifyRun: function (actorId, input) {
        const token = CONFIG.API_KEYS.APIFY;
        const url = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}&timeout=0`;
        const response = this.fetch(url, 'post', input);
        const json = JSON.parse(response.getContentText());
        return json.data.id;
    },
    checkApifyStatus: function (runId) {
        const token = CONFIG.API_KEYS.APIFY;
        const url = `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`;
        const response = this.fetch(url, 'get');
        const json = JSON.parse(response.getContentText());
        return json.data.status;
    },
    fetchApifyResults: function (datasetId) {
        const token = CONFIG.API_KEYS.APIFY;
        const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&format=json`;
        const response = this.fetch(url, 'get');
        return JSON.parse(response.getContentText());
    },
    /**
     * 3. LEADSPICKER ROBOT MANAGEMENT
     */
    updateAndRestartRobot: function (domains) {
        const key = CONFIG.API_KEYS.LEADSPICKER;
        const robotId = CONFIG.LEADSPICKER.ROBOT_ID;
        const projectId = CONFIG.LEADSPICKER.PROJECT_ID;
        const baseUrl = CONFIG.LEADSPICKER.BASE_URL;
        if (!key) {
            throw new Error('Leadspicker API key is not configured');
        }
        // 1. Get Current Robot Settings
        const getUrl = `${baseUrl}/app/sb/api/robots/${robotId}/`;
        const currentResp = this.fetchWithXApiKey(getUrl, 'get', null, key);
        const robotData = JSON.parse(currentResp.getContentText());
        // 2. Prepare Payload
        robotData.robot_urls = domains.join('\n');
        robotData.status = "active";
        robotData.target_project_id = projectId;
        // 3. Update
        const updateUrl = `${baseUrl}/app/sb/api/robots`;
        this.fetchWithXApiKey(updateUrl, 'post', robotData, key);
        // 4. Restart
        const restartUrl = `${baseUrl}/app/sb/api/robots/${robotId}/restart`;
        this.fetchWithXApiKey(restartUrl, 'post', {}, key);
        console.log(`🤖 Robot Updated & Restarted with ${domains.length} domains.`);
    },
    checkLeadspickerStatus: function () {
        const key = CONFIG.API_KEYS.LEADSPICKER;
        const robotId = CONFIG.LEADSPICKER.ROBOT_ID;
        const baseUrl = CONFIG.LEADSPICKER.BASE_URL;
        if (!key) {
            throw new Error('Leadspicker API key is not configured');
        }
        const url = `${baseUrl}/app/sb/api/robots/${robotId}/`;
        const response = this.fetchWithXApiKey(url, 'get', null, key);
        const json = JSON.parse(response.getContentText());
        return {
            status: json.status,
            last_run: json.last_run,
            last_log: json.last_log_message || ''
        };
    },
    getProjectPeople: function (page) {
        const key = CONFIG.API_KEYS.LEADSPICKER;
        const projectId = CONFIG.LEADSPICKER.PROJECT_ID;
        const baseUrl = CONFIG.LEADSPICKER.BASE_URL;
        const url = `${baseUrl}/app/sb/api/projects/${projectId}/people?page=${page}`;
        if (!key) {
            throw new Error('Leadspicker API key is not configured');
        }
        try {
            const response = this.fetchWithXApiKey(url, 'get', null, key);
            const json = JSON.parse(response.getContentText());
            return json.results || json.data || [];
        }
        catch (e) {
            console.warn(`⚠️ Failed to fetch Leadspicker page ${page}: ${e.message}`);
            return [];
        }
    },
    /**
     * 4. LEADSPICKER SEARCH (Direct - Used in Phase 1 if Robot fails)
     */
    findPeopleLeadspicker: function (domain, limit = 20) {
        const key = CONFIG.API_KEYS.LEADSPICKER;
        const url = `https://api.leadspicker.com/v1/people/search`;
        if (!key) {
            throw new Error('Leadspicker API key is not configured');
        }
        // Try with X-API-Key header first
        try {
            const payload = { domain: domain, limit: limit };
            const response = this.fetchWithXApiKey(url, 'post', payload, key);
            const json = JSON.parse(response.getContentText());
            return json.data || json.results || [];
        }
        catch (e) {
            console.warn(`X-API-Key header failed for search API, trying with api_key in payload: ${e.message}`);
            // Fallback: try with api_key in payload
            const payload = { domain: domain, limit: limit, api_key: key };
            const response = this.fetch(url, 'post', payload);
            const json = JSON.parse(response.getContentText());
            return json.data || json.results || [];
        }
    },
    /**
     * FETCH WITH X-API-KEY HEADER (For Leadspicker SB API)
     */
    fetchWithXApiKey: function (url, method, payload, apiKey) {
        const options = {
            method: method,
            muteHttpExceptions: true,
            contentType: 'application/json',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            }
        };
        if (payload) {
            options.payload = JSON.stringify(payload);
        }
        console.log(`📡 Fetching with X-API-Key: ${url} [Method: ${method}]`);
        const response = UrlFetchApp.fetch(url, options);
        const code = response.getResponseCode();
        if (code === 401) {
            const errorBody = response.getContentText();
            console.error(`🛑 Auth Error (401) for ${url}: ${errorBody}`);
            throw new Error(`Leadspicker Authentication Failed (401). Check API Key.`);
        }
        if (code >= 400) {
            const errorBody = response.getContentText();
            console.error(`❌ API Error (${code}): ${errorBody}`);
            throw new Error(`Leadspicker Request Failed (${code}): ${errorBody}`);
        }
        return response;
    },
    /**
     * GENERIC FETCH (for other APIs)
     */
    fetch: function (url, method, payload) {
        const options = {
            method: method,
            muteHttpExceptions: true
        };
        // For GET requests, don't set contentType or payload
        if (method === 'get') {
            // GET requests should not have payload or content-type header
            // unless specifically required
            if (payload) {
                console.warn('⚠️ Warning: GET request with payload - converting to query parameters');
                // If you need to send data with GET, add it as query parameters
                // For now, we'll ignore the payload for GET requests
            }
        }
        else {
            // For POST/PUT/DELETE requests
            options.contentType = 'application/json';
            options.headers = {};
            if (payload) {
                options.payload = JSON.stringify(payload);
            }
        }
        console.log(`📡 Fetching: ${url} [Method: ${method}]`);
        const response = UrlFetchApp.fetch(url, options);
        const code = response.getResponseCode();
        if (code === 405) {
            const errorBody = response.getContentText();
            console.error(`❌ Method Not Allowed (405) for ${url} with method ${method}`);
            console.error(`Endpoint only allows: OPTIONS, GET, PUT, DELETE`);
            throw new Error(`Method ${method} not allowed for this endpoint. Use GET instead.`);
        }
        if (code >= 400) {
            const errorBody = response.getContentText();
            console.error(`❌ API Error (${code}): ${errorBody}`);
            throw new Error(`API Request Failed (${code}): ${errorBody}`);
        }
        return response;
    }
};
