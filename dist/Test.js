/**
 * Run this to see what the script is actually loading from your tabs.
 */
function debugBlacklists() {
    console.log("🔍 Debugging Blacklists...");
    // 1. Load what is in memory
    const lists = Processing.loadBlacklists();
    console.log(`\n📋 Loaded ${lists.domains.size} Blacklisted Domains:`);
    lists.domains.forEach(d => console.log(`   "${d}"`)); // Quotes help see hidden spaces
    console.log(`\n📋 Loaded ${lists.extensions.length} Blacklisted Extensions:`);
    lists.extensions.forEach(e => console.log(`   "${e}"`));
    // 2. Test Specific Cases
    const testCases = [
        "yelp.com",
        "www.yelp.com",
        "https://yelp.com",
        "wikipedia.org",
        "charity.org",
        "google.com"
    ];
    console.log("\n🧪 Running Mock Checks:");
    testCases.forEach(url => {
        // We simulate the extraction that happens in the real script
        const cleanDomain = Processing.extractDomain(url);
        // Fix type error: make sure the 'domains' set is Set<string>
        // Force type assertion for testing only (safe here, as we control the values)
        const fixedLists = {
            domains: lists.domains,
            extensions: lists.extensions
        };
        const isBlocked = Processing.isBlacklisted(cleanDomain || "", fixedLists);
        const status = isBlocked ? "🚫 BLOCKED" : "✅ ALLOWED";
        console.log(`   ${url} -> (${cleanDomain}) : ${status}`);
    });
}
function testMetaScraper() {
    const domains = ['google.com', 'example.com', 'nonexistentsite12345.com'];
    domains.forEach(d => {
        console.log(`\n🕷️ Scraping: ${d}`);
        const result = MetaScraper.scrape(d);
        console.log(`   Title: ${result.title}`);
        console.log(`   Desc:  ${result.description}`);
    });
}
