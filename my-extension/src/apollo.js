const APOLLO_API_KEY = 'uIOWV-BdgYv39cfe0YFmCQ'; // You'll need to add your Apollo API key here

async function searchOrganizationOnApollo(organizationName) {
  const url = 'https://api.apollo.io/v1/organizations/search';
  
  const searchQuery = {
    api_key: APOLLO_API_KEY,
    q_organization_name: organizationName,
    page: 1,
    per_page: 1
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(searchQuery)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.organizations?.[0] || null;
  } catch (error) {
    console.error('Error searching organization on Apollo:', error);
    return null;
  }
}

async function searchPeopleOnApollo(searchParams) {
  const { title, organization } = searchParams;
  
  if (!organization?.domain) {
    throw new Error('Organization domain not found');
  }

  const url = 'https://api.apollo.io/v1/people/search';
  
  const searchQuery = {
    api_key: APOLLO_API_KEY,
    q_organization_domains: [organization.domain],
    person_titles: title,
    page: 1,
    per_page: 10
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(searchQuery)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.people || [];
  } catch (error) {
    console.error('Error searching people on Apollo:', error);
    return [];
  }
}

async function findRelevantConnections(jobData) {
  try {
    // First, search for the organization
    const organization = await searchOrganizationOnApollo(jobData.organization_name);
    
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Then search for people with the relevant titles
    const people = await searchPeopleOnApollo({
      title: jobData.title,
      organization: organization
    });

    return {
      organization,
      people
    };
  } catch (error) {
    console.error('Error finding relevant connections:', error);
    throw error;
  }
}

export { findRelevantConnections }; 