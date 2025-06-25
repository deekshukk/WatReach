function cleanOrgName(name) {
  if (!name) return '';
  // Remove common suffixes and extra whitespace
  return name.replace(/\b(Inc|Ltd|Corp|Corporation|LLC|Limited|Company|Co|Entertainment|Interactive)\.?\b/gi, '').trim();
}

function getSimilarityScore(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Exact match is highest score
    if (s1 === s2) return 100;

    let score = 0;

    // Check for full substring inclusion
    if (s1.includes(s2) || s2.includes(s1)) {
        score += 50;
    }

    // Word-by-word comparison
    const words1 = s1.split(/\s+/).filter(w => w.length > 1);
    const words2 = s2.split(/\s+/).filter(w => w.length > 1);

    const commonWords = words1.filter(word => words2.includes(word)).length;
    score += commonWords * 10; // Each common word adds score

    // Penalty for length difference (less difference is better)
    score -= Math.abs(s1.length - s2.length) * 0.5;

    // Ensure score doesn't go below 0
    return Math.max(0, score);
}

function deriveExpectedDomain(organizationName) {
  const cleanedName = cleanOrgName(organizationName).toLowerCase();
  
  // General heuristic for domain: remove common suffixes and add .com
  let domainCandidate = cleanedName.replace(/\s+/g, ''); // Remove all spaces
  // Remove non-alphanumeric characters, but keep dots if they signify subdomains early on
  domainCandidate = domainCandidate.replace(/[^a-z0-9.]/g, '');

  if (!domainCandidate.includes('.')) {
      domainCandidate += '.com'; // Default to .com if no TLD
  }

  return domainCandidate;
}

const APOLLO_API_KEY = 'RkAYDXn_fooT15v42PkAwg';

// LLM (OpenAI) API Key
const OPENAI_API_KEY = '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'; // IMPORTANT: Replace with your actual key

async function enrichOrganizationByDomain(domain) {
  if (!domain) return null;

  const url = `https://api.apollo.io/api/v1/organizations/enrich?domain=${domain}`;

  try {
    console.log('Apollo API: Enriching organization by domain:', domain);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_API_KEY
      },
    });
    const data = await response.json();
    console.log('Apollo API: Org enrichment response:', JSON.stringify(data, null, 2));

    if (!response.ok || !data.organization) {
      throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(data)}`);
    }

    const org = data.organization;
    // Ensure the domain is set for the returned organization object, as needed by searchPeopleOnApollo
    if (org && !org.domain && org.website_url) {
      try {
        const urlObj = new URL(org.website_url);
        org.domain = urlObj.hostname;
        if (org.domain.startsWith('www.')) {
          org.domain = org.domain.substring(4);
        }
      } catch (e) {
        console.warn('Could not parse domain from website_url for enriched org:', org.name, 'URL:', org.website_url, e);
      }
    }
    return org;
  } catch (error) {
    console.error('Error enriching organization by domain:', error);
    return null;
  }
}

async function searchOrganizationOnApollo(organizationName, locations = [], keywords = []) {
  const url = 'https://api.apollo.io/api/v1/mixed_companies/search';
  const searchQuery = {
    q_organization_name: organizationName, 
    page: 1,
    per_page: 50, // Increase per_page to ensure we get a broader list to search through
  };

  if (locations.length > 0) {
    searchQuery.organization_locations = locations;
  }

  if (keywords.length > 0) {
    searchQuery.q_organization_keyword_tags = keywords;
  }

  try {
    console.log('Apollo API: Searching for organization:', organizationName, 'Locations:', locations, 'Keywords:', keywords);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': APOLLO_API_KEY
      },
      body: JSON.stringify(searchQuery)
    });
    const data = await response.json();
    console.log('Apollo API: Full org search response:', JSON.stringify(data, null, 2));
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(data)}`);
    
    // Return all organizations found, without trying to select a single best one yet
    return data.organizations || data.accounts || data.companies || [];
  } catch (error) {
    console.error('Error searching organization on Apollo:', error);
    return [];
  }
}

async function tryMultipleOrgNames(originalOrganizationName, locations = [], keywords = []) {
  const namesToTry = new Set();
  namesToTry.add(originalOrganizationName); // Original name
  namesToTry.add(cleanOrgName(originalOrganizationName)); // Cleaned name
  
  const parts = originalOrganizationName.split(' ');
  if (parts.length > 0) {
    namesToTry.add(parts[0]); // First word
  }

  // Add a shorter version, e.g., "Rogers Communications" from "Rogers Communications Canada Inc"
  if (parts.length > 2) {
    const shorterName = parts.slice(0, parts.length - 1).join(' ').replace(/(Inc|Ltd|Corp|Corporation|LLC|Limited|Company|Co|Entertainment|Interactive|Canada)\.?/gi, '').trim();
    if (shorterName && shorterName !== originalOrganizationName) {
      namesToTry.add(shorterName);
    }
  }

  // Add name without "Canada" suffix specifically
  const nameWithoutCanadaSuffix = originalOrganizationName.replace(/\sCanada\s*(Inc|Ltd|Corp|Corporation|LLC|Limited|Company|Co|Entertainment|Interactive)?\b/gi, '').trim();
  if (nameWithoutCanadaSuffix && nameWithoutCanadaSuffix !== originalOrganizationName) {
      namesToTry.add(nameWithoutCanadaSuffix);
  }

  const allReturnedOrgs = [];

  for (const nameQuery of Array.from(namesToTry)) {
    if (!nameQuery) continue;
    console.log(`Apollo API: Trying organization name query: "${nameQuery}"`);
    const orgResults = await searchOrganizationOnApollo(nameQuery, locations, keywords);
    if (orgResults && orgResults.length > 0) {
      allReturnedOrgs.push(...orgResults);
    }
  }

  let bestMatch = null;
  let highestScore = -1;
  const targetNameLower = originalOrganizationName.toLowerCase();
  const expectedDomain = deriveExpectedDomain(originalOrganizationName);

  // First, prioritize exact domain match
  if (expectedDomain) {
      for (const org of allReturnedOrgs) {
          if (org.primary_domain && org.primary_domain.toLowerCase() === expectedDomain) {
              console.log(`Found exact domain match for "${originalOrganizationName}": "${org.name}" -> "${org.primary_domain}"`);
              return org; // Return immediately if exact domain match is found
          }
      }
  }

  // If no exact domain match, proceed with similarity scoring
  for (const org of allReturnedOrgs) {
    if (!org.name) continue;
    const orgNameLower = org.name.toLowerCase();

    let currentScore = getSimilarityScore(targetNameLower, orgNameLower);

    // Add bonus for having a website_url and primary_domain, as these are critical for people search
    if (org.website_url && org.primary_domain) {
        currentScore += 20; // Significant bonus for having a domain
    }

    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestMatch = org;
    }
  }

  if (bestMatch) {
    // Extract domain from website_url if foundOrg exists and has website_url
    if (bestMatch.website_url) {
      try {
        const urlObj = new URL(bestMatch.website_url);
        bestMatch.domain = urlObj.hostname;
        if (bestMatch.domain.startsWith('www.')) {
          bestMatch.domain = bestMatch.domain.substring(4);
        }
        console.log('Extracted domain from website_url for selected best match org:', bestMatch.name, '->', bestMatch.domain);
      } catch (e) {
        console.warn('Could not parse domain from website_url for org:', bestMatch.name, 'URL:', bestMatch.website_url, e);
      }
    }
    console.log(`Found best match for "${originalOrganizationName}": "${bestMatch.name}" with score ${highestScore}`);
  } else {
    console.warn(`No strong match found for "${originalOrganizationName}" among Apollo results.`);
  }

  return bestMatch;
}

async function searchPeopleOnApollo(params) {
  // params should include all possible Apollo people search parameters
  // e.g., organization, personTitles, personSeniorities, organizationLocations, personLocations, etc.
  const url = 'https://api.apollo.io/api/v1/mixed_people/search';

  // Build the request body dynamically from params
  const body = {};

  // Organization info
  if (params.organization) {
    if (params.organization.domain) {
      body.q_organization_domains_list = [params.organization.domain];
    }
    if (params.organization.id) {
      body.organization_ids = [params.organization.id];
    }
    if (params.organization.name) {
      body.q_organization_names = [params.organization.name];
    }
  }

  // Titles
  if (params.personTitles && params.personTitles.length > 0) {
    body.person_titles = params.personTitles;
    body.include_similar_titles = true;
  }

  // Seniorities
  if (params.personSeniorities && params.personSeniorities.length > 0) {
    body.person_seniorities = params.personSeniorities;
  }

  // Locations
  if (params.organizationLocations && params.organizationLocations.length > 0) {
    body.organization_locations = params.organizationLocations;
  }
  if (params.personLocations && params.personLocations.length > 0) {
    body.person_locations = params.personLocations;
  }

  // Keywords
  if (params.q_keywords) {
    body.q_keywords = params.q_keywords;
  }

  // Email/contact status
  if (params.contact_email_status && params.contact_email_status.length > 0) {
    body.contact_email_status = params.contact_email_status;
  }

  // Employee ranges
  if (params.organization_num_employees_ranges && params.organization_num_employees_ranges.length > 0) {
    body.organization_num_employees_ranges = params.organization_num_employees_ranges;
  }

  // Pagination
  body.page = params.page || 1;
  body.per_page = params.per_page || 25;

  try {
    console.log('Apollo API: Calling mixed_people/search with body:', body);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': APOLLO_API_KEY
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    console.log('Apollo API: mixed_people/search response:', JSON.stringify(data, null, 2));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(data)}`);
    }
    return data.people || [];
  } catch (error) {
    console.error('Error searching people on Apollo:', error);
    return [];
  }
}

// LLM-powered parameter extraction
async function generateLLMParamsWithOpenAI(jobData) {
  const jobTitle = jobData["Job Title"] || "";
  const organization = jobData["Organization"] || "";
  const jobDescription = jobData["Job Description"] || "";
  const requirements = jobData["Requirements"] || "";

  const prompt = `Given the following job posting, generate a JSON object with:\n- job_titles: 5-7 specific job titles of people who would be decision makers or involved in hiring for this role (e.g., managers, team leads, recruiters, department heads)\n- seniorities: relevant seniority levels (e.g., entry, manager, director, vp, c_suite)\n- keywords: relevant keywords or skills for the search\n\nJob Title: ${jobTitle}\nCompany: ${organization}\nDescription: ${jobDescription.substring(0, 400)}\nRequirements: ${requirements.substring(0, 200)}\n\nReturn ONLY a JSON object like:\n{\n  "job_titles": [...],\n  "seniorities": [...],\n  "keywords": [...]\n}`;

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
          { role: "system", content: "You are an expert at extracting structured search parameters from job postings. Always respond with valid JSON." },
          { role: "user", content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.2
      })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }
    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    // Extract JSON from the response
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}') + 1;
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in LLM response");
    const params = JSON.parse(content.substring(jsonStart, jsonEnd));
    return params;
  } catch (error) {
    console.error("Error calling OpenAI for LLM params:", error);
    throw error;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'findRelevantConnections') {
    (async () => {
      try {
        const originalOrganizationName = request.query.organization_name;
        if (!originalOrganizationName || typeof originalOrganizationName !== 'string' || !originalOrganizationName.trim()) {
          console.error('Organization name is missing or invalid:', originalOrganizationName);
          sendResponse({ error: 'Organization name is missing or invalid.' });
          return;
        }
        console.log('Trying org names:', originalOrganizationName);

        let organization = await enrichOrganizationByDomain(deriveExpectedDomain(originalOrganizationName));
        if (!organization) {
          console.log('Falling back to name-based organization search.');
          organization = await tryMultipleOrgNames(
            originalOrganizationName,
            Array.isArray(request.query.organization_locations) ? request.query.organization_locations : [],
            Array.isArray(request.query.q_organization_keyword_tags) ? request.query.q_organization_keyword_tags : []
          );
        }

        console.log('Organization result:', organization);
        if (!organization) {
          sendResponse({ error: 'Organization not found. Please try editing the organization name and scan again.' });
          return;
        }

        let personTitles = request.query.title;
        try {
          console.log("Requesting AI-generated titles...");
          const aiTitles = await generateContactTitlesWithOpenAI(request.query);
          if (aiTitles?.length > 0) {
            personTitles = aiTitles;
            console.log("Successfully using AI-generated titles:", personTitles);
          }
        } catch (e) {
          console.warn("LLM title generation failed. Falling back to keyword-based titles.", e);
        }

        const people = await searchPeopleOnApollo({
          organization,
          personSeniorities: Array.isArray(request.query.person_seniorities) ? request.query.person_seniorities : [],
          personTitles: Array.isArray(personTitles) ? personTitles : [],
          organizationLocations: Array.isArray(request.query.organization_locations) ? request.query.organization_locations : [],
          q_keywords: request.query.q_keywords || '',
          contact_email_status: Array.isArray(request.query.contact_email_status) ? request.query.contact_email_status : [],
          organization_num_employees_ranges: Array.isArray(request.query.organization_num_employees_ranges) ? request.query.organization_num_employees_ranges : [],
        });

        console.log('People result:', people);
        sendResponse({ organization, people });
      } catch (error) {
        console.error('Error in background script:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true; // Keeps the message port open for async response
  }

  if (request.action === "generateLLMParams") {
    generateLLMParamsWithOpenAI(request.jobData)
      .then(params => sendResponse({ success: true, params }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
}); 
