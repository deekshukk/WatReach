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

async function enrichOrganizationByDomain(domain) {
  if (!domain) return null;

  const url = `https://api.apollo.io/api/v1/organizations/enrich?api_key=${APOLLO_API_KEY}&domain=${domain}`;

  try {
    console.log('Apollo API: Enriching organization by domain:', domain);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
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

async function searchPeopleOnApollo({ organization, personSeniorities = [], personTitles = [] }) {
  if (!organization?.domain) throw new Error('Organization domain not found');
  if (!organization?.id) throw new Error('Organization ID not found for people search.');

  const url = 'https://api.apollo.io/v1/people/search';
  const searchQuery = {
    q_organization_domains: [organization.domain],
    organization_ids: [organization.id],
    page: 1,
    per_page: 50
  };

  // Only add seniorities if they exist and are not too restrictive
  if (personSeniorities.length > 0 && !personSeniorities.includes('intern')) {
    searchQuery.person_seniorities = personSeniorities;
  }

  // Only add titles if they exist
  if (personTitles.length > 0) {
    searchQuery.person_titles = personTitles;
    searchQuery.include_similar_titles = true;
  }

  try {
    console.log('Apollo API: Searching for people at org domain:', organization.domain, 'Org ID:', organization.id, 'Seniorities:', personSeniorities, 'Titles:', personTitles);
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
    console.log('Apollo API: Full people search response:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(data)}`);
    }

    // Check if we have any people in the response
    if (!data.people || data.people.length === 0) {
      console.log('No people found for organization:', organization.name);
      return [];
    }

    return data.people;
  } catch (error) {
    console.error('Error searching people on Apollo:', error);
    return [];
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'findRelevantConnections') {
    (async () => {
      try {
        const originalOrganizationName = request.query.organization_name;
        console.log('Trying org names:', originalOrganizationName);

        let organization = null;
        const expectedDomain = deriveExpectedDomain(originalOrganizationName);

        if (expectedDomain) {
          organization = await enrichOrganizationByDomain(expectedDomain);
          if (organization) {
            console.log(`Successfully found organization via domain enrichment: ${organization.name} -> ${organization.domain}`);
          }
        }

        // If domain enrichment failed or no domain was derived, fallback to name-based search
        if (!organization) {
          console.log('Falling back to name-based organization search.');
          organization = await tryMultipleOrgNames(
            originalOrganizationName,
            request.query.organization_locations,
            request.query.q_organization_keyword_tags
          );
        }

        console.log('Organization result:', organization);

        if (!organization) {
          sendResponse({ error: 'Organization not found. Please try editing the organization name and scan again.' });
          return;
        }
        const people = await searchPeopleOnApollo({
          organization,
          personSeniorities: request.query.person_seniorities,
          personTitles: request.query.title,
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
}); 