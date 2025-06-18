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

  function extractQueryParams(jobData, defaultPersonCount = 5) {
    const jobTitleRaw = jobData["Job Title"] || "";
    const companyName = jobData["Organization"] || "";
    const jobLocationRaw = jobData["Location"] || "";
    const jobCategoryRaw = jobData["Category"] || jobData["Job Category"] || jobData["Skills"] || "";
    const jobDescriptionRaw = jobData["Job Description"] || "";
  
    const jobTitle = jobTitleRaw.toLowerCase();
    const jobDescription = jobDescriptionRaw.toLowerCase();
  
    const titleMap = {
      software: ["Software Engineer", "Technical Recruiter", "Engineering Manager", "Hiring Manager", "Talent Acquisition"],
      finance: ["Finance Analyst", "Portfolio Manager", "Investment Analyst", "Finance Recruiter", "Hiring Manager", "Talent Acquisition"],
      investment: ["Investment Analyst", "Wealth Manager", "Financial Advisor", "Recruiter", "Hiring Manager", "Talent Acquisition"],
      product: ["Product Manager", "Product Owner", "Technical Recruiter", "Hiring Manager", "Talent Acquisition"],
      data: ["Data Scientist", "ML Engineer", "Analytics Manager", "Data Recruiter", "Hiring Manager", "Talent Acquisition"],
      design: ["UX Designer", "Product Designer", "Design Manager", "Recruiter", "Hiring Manager", "Talent Acquisition"],
      legal: ["Legal Counsel", "Compliance Officer", "Legal Recruiter", "Hiring Manager", "Talent Acquisition"],
      marketing: ["Marketing Manager", "Digital Strategist", "Marketing Recruiter", "Hiring Manager", "Talent Acquisition"],
      sales: ["Sales Manager", "Account Executive", "Sales Recruiter", "Hiring Manager", "Talent Acquisition"],
      accounting: ["Accountant", "Controller", "Accounting Recruiter", "Hiring Manager", "Talent Acquisition"],
    };
  
    const matchedTitles = new Set();
  
    // Map keywords → titles
    for (const [keyword, titles] of Object.entries(titleMap)) {
      if (jobTitle.includes(keyword) || jobDescription.includes(keyword)) {
        titles.forEach(t => matchedTitles.add(t));
      }
    }
  
    // Always include these general titles
    matchedTitles.add("Recruiter");
    matchedTitles.add("Hiring Manager");
    matchedTitles.add("Talent Acquisition");
  
    const matchedSeniorities = new Set();
    const seniorityMap = {
      'entry': ['entry-level', 'junior', 'intern', 'co-op'],
      'senior': ['senior', 'sr.', 'lead'],
      'manager': ['manager', 'lead'],
      'director': ['director'],
      'vp': ['vp', 'vice president'],
      'head': ['head of'],
      'founder': ['founder'],
      'c_suite': ['ceo', 'cto', 'cfo', 'coo', 'cmo', 'cio', 'chief'],
      'partner': ['partner']
    };

    // Map keywords/phrases in title and description to seniorities
    for (const [seniorityLevel, keywords] of Object.entries(seniorityMap)) {
      for (const keyword of keywords) {
        if (jobTitle.includes(keyword) || jobDescription.includes(keyword)) {
          matchedSeniorities.add(seniorityLevel);
        }
      }
    }

    // Default to 'entry' and 'senior' if no specific seniority is found
    if (matchedSeniorities.size === 0) {
      matchedSeniorities.add('entry');
      matchedSeniorities.add('senior');
    }
  
    const result = {
      title: Array.from(matchedTitles),
      organization_name: companyName.trim(),
      organization_locations: jobLocationRaw.split(',').map(loc => loc.trim()).filter(Boolean),
      q_organization_keyword_tags: jobCategoryRaw.split(',').map(tag => tag.trim()).filter(Boolean),
      person_seniorities: Array.from(matchedSeniorities),
    };
  
    console.log("✅ extractQueryParams →", result);
    return result;
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanJobPosting") {
      const job = extractJobInfoFromTags();
      const query = extractQueryParams(job);

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
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
