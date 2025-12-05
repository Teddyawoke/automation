import { ApiClient } from './ApiClient';
import { CONFIG } from './Config';

export const Qualification = {

  /**
   * ASK GEMINI: Does this company fit the criteria?
   */
  qualifyCompany: function(domain: string, meta: { title: string, description: string }, criteria: string): { match: string, reason: string, confidence: number } {
    
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
    } catch (e) {
      console.error(`Qualify Error (${domain}):`, e);
      return { match: "NO", reason: "AI Failed", confidence: 0 };
    }
  }
};