const dev = {
    taxonSuggestUrl : 'https://api.gbif.org/v1/species/suggest',
    taxonSearchUrl : 'https://api.gbif.org/v1/species/search',
    gbifBackboneKey: 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c',
    phylonextWebservice: 'http://localhost:9000',
    authWebservice: 'http://localhost:9000/api/auth'
};

// Add debug logging for config
console.log('Using config:', process.env.NODE_ENV === 'production' ? 'production' : 'development', {
    baseUrl: dev.phylonextWebservice,
    fullRunsUrl: `${dev.phylonextWebservice}/api/phylonext/runs`
});

const prod = {
    taxonSuggestUrl : 'https://api.gbif.org/v1/species/suggest',
    taxonSearchUrl : 'https://api.gbif.org/v1/species/search',
    gbifBackboneKey: 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c',
    phylonextWebservice:  'https://phylonext.gbif.org/service', 
    authWebservice: 'https://phylonext.gbif.org/service/auth'
};

// Default to dev in development, unless explicitly set to production
const config =  process.env.NODE_ENV === 'production' ? prod : dev;

export default config;