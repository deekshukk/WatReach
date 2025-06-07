import { findRelevantConnections } from './apollo';

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

  function extractQueryParams(jobData, defaultPersonCount = 5) {
    const jobTitleRaw = jobData["Job Title"] || "";
    const companyName = jobData["Organization"] || "";
  
    const jobTitle = jobTitleRaw.toLowerCase();
  
    const titleMap = {
      software: ["Software Engineer", "Technical Recruiter", "Engineering Manager"],
      finance: ["Finance Analyst", "Portfolio Manager", "Investment Analyst", "Finance Recruiter"],
      investment: ["Investment Analyst", "Wealth Manager", "Financial Advisor", "Recruiter"],
      product: ["Product Manager", "Product Owner", "Technical Recruiter"],
      data: ["Data Scientist", "ML Engineer", "Analytics Manager", "Data Recruiter"],
      design: ["UX Designer", "Product Designer", "Design Manager", "Recruiter"],
      legal: ["Legal Counsel", "Compliance Officer", "Legal Recruiter"],
      marketing: ["Marketing Manager", "Digital Strategist", "Marketing Recruiter"],
      sales: ["Sales Manager", "Account Executive", "Sales Recruiter"],
      accounting: ["Accountant", "Controller", "Accounting Recruiter"],
    };
  
    const matchedTitles = new Set();
  
    // Map keywords → titles
    for (const [keyword, titles] of Object.entries(titleMap)) {
      if (jobTitle.includes(keyword)) {
        titles.forEach(t => matchedTitles.add(t));
      }
    }
  
    if (matchedTitles.size === 0) {
      matchedTitles.add("Recruiter");
      matchedTitles.add("Hiring Manager");
    }
  
    const result = {
      title: Array.from(matchedTitles),
      organization_name: companyName.trim(),
    };
  
    console.log("✅ extractQueryParams →", result);
    return result;
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanJobPosting") {
      const job = extractJobInfoFromTags();
      console.log("✅ Job Data sent to popup:", job);
      sendResponse(job); 
      const query = extractQueryParams(job);
      console.log("Query params:", query);
      
      // Find relevant connections using Apollo
      findRelevantConnections(query)
        .then(result => {
          // Send the results back to the popup
          chrome.runtime.sendMessage({
            action: "apolloResults",
            organization: result.organization,
            people: result.people
          });
        })
        .catch(error => {
          console.error("Error finding connections:", error);
          chrome.runtime.sendMessage({
            action: "apolloError",
            error: error.message
          });
        });
    }
  });
  
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
