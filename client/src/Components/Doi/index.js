import React from 'react';


export function Doi({id = '', ...props}) {
  let sanitizedId = id.replace(/^(.*doi.org\/)?(doi:)?(10\.)/, '10.');
  return <a href={`https://doi.org/${sanitizedId}`} className="doi">
    <span>DOI</span>
    <span>{sanitizedId}</span>
  </a>
}

