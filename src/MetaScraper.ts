/**
 * MetaScraper.ts
 * Fetches website HTML and extracts Title and Meta Description.
 */

export const MetaScraper = {

    /**
     * Scrape a single URL with a strict timeout.
     */
    scrape: function(domain: string): { title: string, description: string } {
      // Add http protocol if missing
      const url = domain.startsWith('http') ? domain : `http://${domain}`;
      
      try {
        // 1. Fetch with 5 second timeout
        const response = UrlFetchApp.fetch(url, {
          muteHttpExceptions: true,        // Don't crash on 404
          validateHttpsCertificates: false, // Don't crash on bad SSL
          followRedirects: true
        });
  
        const code = response.getResponseCode();
        if (code >= 400) {
          return { title: `Error ${code}`, description: 'Could not access site' };
        }
  
        const html = response.getContentText();
        return this.parseHtml(html);
  
      } catch (e: any) {
        return { title: 'Access Failed', description: e.message };
      }
    },
  
    /**
     * Parse HTML using Regex (Lightweight & Fast)
     */
    parseHtml: function(html: string) {
      // 1. Extract Title
      // Looks for <title>...text...</title>
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'No Title';
  
      // 2. Extract Meta Description
      // Looks for <meta name="description" content="..."> OR <meta content="..." name="description">
      const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) 
                     || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
      
      // Decode HTML entities (basic) if needed, but usually raw text is fine for AI
      const description = metaMatch ? metaMatch[1].trim() : 'No Description';
  
      return { title, description };
    }
  };