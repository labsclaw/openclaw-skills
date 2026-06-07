# Example: Finding Skills by Domain

## Scenario

User: "I need to add web scraping capabilities to my project"

## Agent Process (using ultra-find-skill)

### Step 1: Evaluate Need
The task involves web scraping — a complex, multi-domain task that likely
has existing skills. Proceed to search.

### Step 2: Search Locally
```bash
bash scripts/scan-local-skills.sh "scraping"
```
Result: No local skills found matching "scraping".

### Step 3: Search Remote

**Check skills.sh leaderboard:**
No web scraping skills in top results.

**Run CLI search:**
```bash
npx skills find "web scraping"
```

**GitHub search results:**
| Skill | Repository | Score |
|-------|-----------|-------|
| `web-scraper` | sanjay3290/ai-skills | 82/100 |
| `crawl-and-extract` | community/agent-skills | 71/100 |
| `puppeteer-skill` | LambdaTest/agent-skills | 78/100 |

### Step 4: Present Results

```
🔍 Top Results for "web scraping":

1. 📦 web-scraper (Score: 82/100)
   Web scraping with JS rendering and rate limiting
   Source: github.com/sanjay3290/ai-skills
   Install: npx skills add sanjay3290/ai-skills --skill web-scraper

2. 📦 puppeteer-skill (Score: 78/100)
   Browser automation and scraping with Puppeteer
   Source: github.com/LambdaTest/agent-skills
   Install: npx skills add LambdaTest/agent-skills --skill puppeteer-skill

3. 📦 crawl-and-extract (Score: 71/100)
   Simple crawl and text extraction
   Source: github.com/community/agent-skills
   Install: npx skills add community/agent-skills --skill crawl-and-extract

💡 Recommendation: web-scraper has the highest quality score.
   Run security review before installing.
```
