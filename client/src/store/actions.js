// Re-export actions from resultsSlice
export {
  setPipelineStatus,
  setGeoJSON,
  setJobId,
  setError as setResultsError,
  resetResults,
  setIndices
} from './resultsSlice'; 