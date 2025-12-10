const Qualification = {
    /**
     * ASK GEMINI: Does this company fit the criteria?
     */
    qualifyCompany: function (domain, meta, criteria) {
        const prompt = `
      Role: Market Research Analyst.
      Task: Determine if the following company fits the User's Target Group.
      
      User Target Group: "${criteria}"
      
      Company Data:
      - Domain: ${domain}
      - Website Title: "${meta.title}"
      - Website Description: "${meta.description}"
      
      Instructions:
      1. Analyze the title and description.
      2. If it clearly fits the target group, Match = YES.
      3. If it is clearly irrelevant (e.g., a blog, directory, unrelated industry), Match = NO.
      4. If ambiguous but likely B2B, Match = YES.
      
      Output Format: JSON only.
      {
        "match": "YES" or "NO",
        "reason": "Short 1-sentence explanation",
        "confidence": 0.0 to 1.0
      }
    `;
        try {
            const jsonStr = ApiClient.callGemini(prompt);
            const result = JSON.parse(jsonStr);
            return {
                match: result.match || "NO",
                reason: result.reason || "AI parsing error",
                confidence: result.confidence || 0
            };
        }
        catch (e) {
            console.error(`Qualify Error (${domain}):`, e);
            return { match: "NO", reason: "AI Failed", confidence: 0 };
        }
    },
    qualifyJobTitle: function (title, userCriteria) {
        if (!title)
            return false;
        const cleanTitle = title.toLowerCase();
        // ----------------------------------------
        // STAGE 1: Fast Seniority Filter
        // ----------------------------------------
        const seniorRoles = [
            'ceo', 'founder', 'owner', 'partner', 'president',
            'director', 'head', 'chief', 'vp', 'vice president',
            'manager', 'lead', 'decision maker'
        ];
        const hasSeniority = seniorRoles.some(role => cleanTitle.includes(role));
        // If not senior, reject immediately (save API cost)
        if (!hasSeniority) {
            return false;
        }
        // ----------------------------------------
        // STAGE 2: Gemini Functional Fit
        // ----------------------------------------
        const prompt = `
      Task: Match Job Title.
      Candidate Title: "${title}"
      Target Criteria: "${userCriteria}"
      
      Does the Candidate match the Target in terms of Function/Department?
      (Note: Seniority is already verified).
      
      Reply ONLY: YES or NO.
    `;
        try {
            const result = ApiClient.callGemini(prompt).trim().toUpperCase();
            return result.includes('YES');
        }
        catch (e) {
            console.warn("Gemini Job Check Failed, failing open (YES).");
            return true;
        }
    }
};
