
const config = {
    taxonSuggestUrl : 'https://api.gbif.org/v1/species/suggest',
    taxonSearchUrl : 'https://api.gbif.org/v1/species/search',
    gbifBackboneKey: 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c',
    phylonextWebservice: 'http://localhost:9000/phylonext',
    authWebservice: 'http://localhost:9000/auth'
}


const prod = {
    taxonSuggestUrl : 'https://api.gbif.org/v1/species/suggest',
    taxonSearchUrl : 'https://api.gbif.org/v1/species/search',
    gbifBackboneKey: 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c',
    phylonextWebservice:  'https://phylonext.gbif.org/service/phylonext', 
    authWebservice: 'https://phylonext.gbif.org/service/auth'
}

export default prod;