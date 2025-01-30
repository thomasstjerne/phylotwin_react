import * as d3 from 'd3-scale-chromatic';
import { scaleLinear, scaleSequential, scaleDiverging } from 'd3-scale';

// Available color palettes for each data type
export const PALETTES = {
  sequential: [
    { id: 'Blues', name: 'Blues', scale: d3.interpolateBlues },
    { id: 'YlGnBu', name: 'Yellow-Green-Blue', scale: d3.interpolateYlGnBu },
    { id: 'Viridis', name: 'Viridis', scale: d3.interpolateViridis },
    { id: 'Plasma', name: 'Plasma', scale: d3.interpolatePlasma },
    { id: 'Magma', name: 'Magma', scale: d3.interpolateMagma }
  ],
  bounded: [
    { id: 'Viridis', name: 'Viridis', scale: d3.interpolateViridis },
    { id: 'Plasma', name: 'Plasma', scale: d3.interpolatePlasma },
    { id: 'Magma', name: 'Magma', scale: d3.interpolateMagma }
  ],
  diverging: [
    { id: 'RdBu', name: 'Red-Blue', scale: d3.interpolateRdBu },
    { id: 'RdYlBu', name: 'Red-Yellow-Blue', scale: d3.interpolateRdYlBu },
    { id: 'PiYG', name: 'Pink-Yellow-Green', scale: d3.interpolatePiYG }
  ],
  CANAPE: {
    NEO: "#FF0000",
    PALAEO: "#4876FF",
    "non-significant": "#FAFAD2",
    MIXED: "#CB7FFF",
    SUPER: "#9D00FF"
  }
};

// Default palettes for each type
const DEFAULT_PALETTES = {
  sequential: 'Viridis',
  bounded: 'Viridis',
  diverging: 'RdBu'
};

/**
 * Creates a sequential color scale
 * @param {[number, number]} domain - [min, max] values
 * @param {string} palette - Palette ID from PALETTES.sequential
 * @returns {Function} Color scale function
 */
export const createSequentialScale = (domain, palette = DEFAULT_PALETTES.sequential) => {
  const colorScale = PALETTES.sequential.find(p => p.id === palette)?.scale || 
                    PALETTES.sequential.find(p => p.id === DEFAULT_PALETTES.sequential).scale;
  
  // Create a linear scale to normalize values to [0, 1]
  const normalizer = scaleLinear()
    .domain(domain)
    .range([0, 1])
    .clamp(true);  // Clamp values to the domain

  // If domain range is 4 (quantile bins), create discrete colors
  if (domain[1] - domain[0] === 4) {
    return value => {
      // Map each bin index to an evenly spaced point in the color scale
      const binPosition = (Math.floor(value) + 0.5) / 5;  // Center each bin's color
      return colorScale(binPosition);
    };
  }

  // Return a function that normalizes the input and then applies the color scale
  return value => colorScale(normalizer(value));
};

/**
 * Creates a bounded color scale (0-1)
 * @param {string} palette - Palette ID from PALETTES.bounded
 * @returns {Function} Color scale function
 */
export const createBoundedScale = (palette = DEFAULT_PALETTES.bounded) => {
  const colorScale = PALETTES.bounded.find(p => p.id === palette)?.scale || 
                    PALETTES.bounded.find(p => p.id === DEFAULT_PALETTES.bounded).scale;
  
  // Create a linear scale that clamps values to [0, 1]
  const normalizer = scaleLinear()
    .domain([0, 1])
    .range([0, 1])
    .clamp(true);

  // Return a function that clamps the input and then applies the color scale
  return value => colorScale(normalizer(value));
};

/**
 * Creates a diverging color scale centered at 0
 * @param {[number, number]} domain - [min, max] values
 * @param {string} palette - Palette ID from PALETTES.diverging
 * @returns {Function} Color scale function
 */
export const createDivergingScale = (domain, palette = DEFAULT_PALETTES.diverging) => {
  const colorScale = PALETTES.diverging.find(p => p.id === palette)?.scale || 
                    PALETTES.diverging.find(p => p.id === DEFAULT_PALETTES.diverging).scale;
  
  const [min, max] = domain;
  const absMax = Math.max(Math.abs(min), Math.abs(max));
  
  // Create a linear scale that maps the domain to [-1, 1]
  const normalizer = scaleLinear()
    .domain([-absMax, 0, absMax])
    .range([0, 0.5, 1])
    .clamp(true);

  // Return a function that normalizes the input and then applies the color scale
  return value => colorScale(normalizer(value));
};

/**
 * Creates a CANAPE color scale
 * @returns {Function} Color scale function that maps CANAPE categories to colors
 */
export const createCanapeScale = () => {
  return value => {
    // Handle both string and numeric values for backward compatibility
    if (typeof value === 'number') {
      const numericToString = {
        0: 'non-significant',
        1: 'NEO',
        2: 'PALAEO',
        3: 'MIXED',
        4: 'SUPER'
      };
      value = numericToString[value];
    }
    return PALETTES.CANAPE[value] || "#808080"; // Gray for missing values
  };
};

/**
 * Get appropriate color scale based on data type and domain
 * @param {string} type - Data type ('sequential', 'bounded', 'diverging', or 'CANAPE')
 * @param {[number, number]} domain - [min, max] values
 * @param {string} palette - Palette ID
 * @returns {Function} Color scale function
 */
export const getColorScale = (type, domain, palette) => {
  // Add logging for debugging
  console.log('Creating color scale:', { type, domain, palette });
  
  switch (type) {
    case 'sequential':
      return createSequentialScale(domain, palette);
    case 'bounded':
      return createBoundedScale(palette);
    case 'diverging':
      return createDivergingScale(domain, palette);
    case 'CANAPE':
      return createCanapeScale();
    default:
      console.warn(`Unknown data type: ${type}, falling back to sequential`);
      return createSequentialScale(domain, palette);
  }
};

/**
 * Get available palettes for a given data type
 * @param {string} type - Data type ('sequential', 'bounded', or 'diverging')
 * @returns {Array} Array of palette objects
 */
export const getPalettesForType = (type) => {
  return PALETTES[type] || PALETTES.sequential;
};

/**
 * Get default palette for a given data type
 * @param {string} type - Data type ('sequential', 'bounded', or 'diverging')
 * @returns {string} Default palette ID
 */
export const getDefaultPalette = (type) => {
  return DEFAULT_PALETTES[type] || DEFAULT_PALETTES.sequential;
}; 