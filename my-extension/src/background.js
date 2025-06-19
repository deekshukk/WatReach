const OPENAI_API_KEY = 'sk-your-api-key-here'; 

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateContactTitles") {
    generateContactTitlesWithOpenAI(request.jobData)
      .then(titles => {
        sendResponse({ success: true, titles: titles });
      })
      .catch(error => {
        console.error("OpenAI API error:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  }
});

async function generateContactTitlesWithOpenAI(jobData) {
  const jobTitle = jobData["Job Title"] || "";
  const organization = jobData["Organization"] || "";
  const jobDescription = jobData["Job Description"] || "";
  const requirements = jobData["Requirements"] || "";
  
  const prompt = `Based on this job posting, generate 5-7 specific job titles of people who would be decision makers or involved in hiring for this role. Consider managers, team leads, recruiters, and department heads.

Job Title: ${jobTitle}
Company: ${organization}
Description: ${jobDescription.substring(0, 400)}
Requirements: ${requirements.substring(0, 200)}

Return ONLY a JSON array of job titles, no other text. Example: ["Engineering Manager", "Senior Technical Recruiter", "VP of Engineering"]`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert at identifying hiring decision makers. Always respond with valid JSON arrays of realistic job titles."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Clean up the response - sometimes AI adds extra text
    if (content.includes('[')) {
      content = content.substring(content.indexOf('['));
    }
    if (content.includes(']')) {
      content = content.substring(0, content.lastIndexOf(']') + 1);
    }
    
    const titles = JSON.parse(content);
    
    if (!Array.isArray(titles)) {
      throw new Error("Invalid response format from OpenAI");
    }
    
    return titles;
    
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw error;
  }
}
