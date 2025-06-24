console.log("content.js scraper is live");

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

// Fallback function for when AI fails
function getFallbackTitles(jobTitle) {
    const jobTitleLower = jobTitle.toLowerCase();
    
    const titleMap = {
        software: ["Software Engineering Manager", "Technical Recruiter", "VP of Engineering", "Senior Software Engineer"],
        engineer: ["Engineering Manager", "Technical Lead", "VP of Engineering", "Technical Recruiter"],
        finance: ["Finance Director", "Portfolio Manager", "Investment Team Lead", "Finance Recruiter"],
        product: ["Head of Product", "Product Manager", "VP of Product", "Product Recruiter"],
        data: ["Data Science Manager", "ML Engineering Lead", "Analytics Director", "Technical Recruiter"],
        design: ["Design Manager", "Head of Design", "UX Director", "Creative Recruiter"],
        marketing: ["Marketing Director", "CMO", "Digital Marketing Lead", "Marketing Recruiter"],
        sales: ["Sales Director", "VP of Sales", "Sales Manager", "Sales Recruiter"],
    };
    
    for (const [keyword, titles] of Object.entries(titleMap)) {
        if (jobTitleLower.includes(keyword)) {
            return titles;
        }
    }
    
    // Default fallback
    return ["Hiring Manager", "Technical Recruiter", "Early Talent"];
}

async function extractQueryParams(jobData) {
    const companyName = jobData["Organization"] || "";
    const jobTitle = jobData["Job Title"] || "";
    
    console.log("🤖 Requesting AI-generated contact titles...");
    
    try {
        // Send message to background script to call OpenAI API
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
                {
                    action: "generateContactTitles",
                    jobData: jobData
                },
                resolve
            );
        });
        
        let titles;
        if (response.success) {
            titles = response.titles;
            console.log("✅ AI-generated titles:", titles);
        } else {
            console.warn("❌ AI generation failed:", response.error);
            titles = getFallbackTitles(jobTitle);
            console.log("🔄 Using fallback titles:", titles);
        }
        
        const result = {
            title: titles.slice(0, 6), // Limit to 6 titles
            organization_name: companyName.trim(),
            ai_generated: response.success
        };
        
        return result;
        
    } catch (error) {
        console.error("Error in extractQueryParams:", error);
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
            console.log("✅ Final query params:", query);
            sendResponse({ 
                jobData: job, 
                queryParams: query,
                success: true 
            });
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

const observer = new MutationObserver(() => {
    const modal = document.querySelector('.modal__content.height--100.overflow--hidden');
    const alreadyInjected = document.getElementById("watreach-btn");
  
    if (modal && !alreadyInjected) {
        console.log("🟢 Modal detected, injecting button...");
        // injectWatReachButton(modal); // Uncomment when you implement this
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
