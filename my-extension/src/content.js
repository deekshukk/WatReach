console.log("content.js scraper is live");

// Define the observer before using it
const observer = new MutationObserver(() => {
  // You can add logic here if you want to react to DOM changes
});

function extractJobInfoFromTags() {
    const modal = document.querySelector(".modal__content.height--100.overflow--hidden");
    if (!modal) {
      console.warn("Selector not found");
      return {};
    }
  
    const infoBlocks = modal.querySelectorAll(".tag__key-value-list.js--question--container");
    const jobData = {};
  
    infoBlocks.forEach((block) => {
      const labelSpan = block.querySelector("span.label");
      if (!labelSpan) return;
  
      const label = labelSpan.innerText.trim().replace(/:$/, "");
        const nodes = Array.from(block.querySelectorAll("p, li"))
        .map((el) => el.innerText.trim())
        .filter(Boolean);
  
      let value;
      if (nodes.length) {
        value = nodes.join("\n\n");
      } else {
        const allLines = block.innerText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (allLines[0] === label + ":") allLines.shift();
        value = allLines.join("\n\n");
      }
  
      jobData[label] = value;
    });
  
    return jobData;
}

async function extractQueryParams(jobData) {
  const companyName = jobData["Organization"] || "";
  const jobTitle = jobData["Job Title"] || "";

  // Try LLM-powered extraction first
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "generateLLMParams",
          jobData: jobData
        },
        resolve
      );
    });
    if (response.success && response.params) {
      console.log("✅ LLM params:", response.params);
      return {
        title: response.params.job_titles || [],
        person_seniorities: response.params.seniorities || [],
        q_organization_keyword_tags: response.params.keywords || [],
        organization_name: companyName.trim(),
        ai_generated: true
      };
    } else {
      throw new Error(response.error || "LLM extraction failed");
    }
  } catch (error) {
    console.warn("LLM extraction failed, falling back to keyword logic:", error);
    // Fallback to your original extraction logic
    const fallbackTitles = getFallbackTitles(jobTitle);
    return {
      title: fallbackTitles,
      organization_name: companyName.trim(),
      ai_generated: false
    };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanJobPosting") {
        const job = extractJobInfoFromTags();
        console.log("✅ Job Data extracted:", job);
        
        extractQueryParams(job).then(query => {
            // Ensure organization_name is always set from scraped job data if missing
            if (!query.organization_name || !query.organization_name.trim()) {
                query.organization_name = job["Organization"] || "";
            }
            console.log("✅ Final query params:", query);
            chrome.runtime.sendMessage(
                {
                    action: "findRelevantConnections",
                    query
                },
                (response) => {
                    if (response && response.error) {
                        chrome.runtime.sendMessage({
                            action: "apolloError",
                            error: response.error
                        });
                    } else if (response) {
                        chrome.runtime.sendMessage({
                            action: "apolloResults",
                            organization: response.organization,
                            people: response.people
                        });
                    } else {
                        chrome.runtime.sendMessage({
                            action: "apolloError",
                            error: "No response from background script."
                        });
                    }
                }
            );
            sendResponse(job);
        }).catch(error => {
            console.error("Error generating query params:", error);
            sendResponse({ 
                jobData: job, 
                error: error.message,
                success: false 
            });
        });
        
        return true; // Keep message channel open for async response
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
});
