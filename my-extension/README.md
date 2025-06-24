# WatReach Chrome Extension

WatReach is a Chrome extension that helps users find relevant LinkedIn connections for job postings on WaterlooWorks by leveraging AI (OpenAI LLM) and the Apollo API.

## Features
- **Job Scraping:** Extracts job title, company, description, requirements, and more from WaterlooWorks job postings.
- **AI-Powered Parameter Extraction:** Uses OpenAI's GPT model to generate the most relevant job titles, seniorities, and keywords for people/org search.
- **Apollo API Integration:** Searches for organizations and people using Apollo's API, based on AI-refined parameters.
- **Robust Fallbacks:** If the LLM fails, falls back to keyword-based extraction logic.
- **Modern React UI:** Displays results in a clean, user-friendly popup.

## How It Works
1. **User visits a job posting on WaterlooWorks.**
2. **User clicks the extension and scans the job posting.**
3. **Content script scrapes job data** (title, company, description, requirements, etc.).
4. **Job data is sent to the background script,** which:
    - Calls OpenAI with a prompt to generate:
      - `job_titles`: Decision-maker titles (e.g., "Engineering Manager", "Recruiter")
      - `seniorities`: Relevant seniority levels (e.g., "manager", "director")
      - `keywords`: Skills/keywords for search
    - If LLM fails, falls back to keyword mapping.
5. **Apollo API is called** with these parameters to find organizations and people.
6. **Results are shown in the popup UI.**

## Key Files
- `src/content.js`: Scrapes job data, calls LLM for parameters, sends search requests.
- `src/background.js`: Handles LLM calls, Apollo org/people search, and message passing.
- `manifest.json`: Declares permissions for Apollo and OpenAI APIs.
- `webpack.config.js`: Build configuration.

## LLM Prompt Example
```
Given the following job posting, generate a JSON object with:
- job_titles: 5-7 specific job titles of people who would be decision makers or involved in hiring for this role (e.g., managers, team leads, recruiters, department heads)
- seniorities: relevant seniority levels (e.g., entry, manager, director, vp, c_suite)
- keywords: relevant keywords or skills for the search

Job Title: {job_title}
Company: {company}
Description: {description}
Requirements: {requirements}

Return ONLY a JSON object like:
{
  "job_titles": [...],
  "seniorities": [...],
  "keywords": [...]
}
```

## Setup & Usage
1. **Clone the repo and install dependencies:**
   ```sh
   git clone https://github.com/deekshukk/watreach.git
   cd watreach/my-extension
   npm install
   ```
2. **Add your API keys:**
   - OpenAI: Set `OPENAI_API_KEY` in `src/background.js`.
   - Apollo: Set `APOLLO_API_KEY` in `src/background.js`.
3. **Build the extension:**
   ```sh
   npm run build
   ```
4. **Load in Chrome:**
   - Go to `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked" and select the `dist` folder
5. **Use the extension:**
   - Go to a WaterlooWorks job posting
   - Click the extension icon and scan the job
   - View relevant connections in the popup

## Troubleshooting
- If you see errors about missing organization name, check your scraping logic and ensure `organization_name` is always set.
- If the LLM fails, the extension will fall back to keyword-based extraction.
- Check the Chrome extension background page console for detailed logs.

## Security Note
- **Do not commit your API keys to public repositories.**
- This extension is for educational and internal use only.

## Credits
- Built by Yashvanth and collaborators.
- Uses OpenAI and Apollo APIs.

---

For further improvements, you can refine the LLM prompt, enhance the UI, or add more robust error handling as needed. 