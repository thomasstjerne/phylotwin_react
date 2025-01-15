import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { axiosWithAuth } from '../Auth/userApi';
import config from '../config';
import { setPipelineStatus, setIndices, setGeoJSON, setError } from '../store/resultsSlice';
import { setSelectedIndices } from '../store/visualizationSlice';

const POLL_INTERVAL = 1500; // 1.5 seconds

const JobStatusPoller = () => {
  const dispatch = useDispatch();
  const { jobId, status } = useSelector((state) => state.results);

  const fetchResults = useCallback(async (jobId) => {
    try {
      // Fetch the diversity estimates file
      console.log('Fetching results for job:', jobId);
      const response = await axiosWithAuth.get(
        `${config.phylonextWebservice}/api/phylonext/jobs/${jobId}/output/02.Diversity_estimates/diversity_estimates.geojson`
      );
      
      if (response.data) {
        const geoJSON = response.data;
        console.log('Received GeoJSON data:', {
          type: geoJSON.type,
          featureCount: geoJSON.features?.length,
          sampleProperties: geoJSON.features?.[0]?.properties
        });

        // Extract indices from GeoJSON properties
        const properties = geoJSON.features?.[0]?.properties || {};
        const indices = Object.keys(properties).filter(key => 
          !['h3_index', 'NumRecords', 'Redundancy'].includes(key)
        );

        console.log('Found indices:', indices);
        
        // Update Redux state
        console.log('Updating Redux state with:', {
          indices,
          status: 'completed'
        });
        
        dispatch(setIndices(indices));
        dispatch(setGeoJSON(geoJSON));
        dispatch(setPipelineStatus('completed'));

        // Automatically select Richness index if available
        if (indices.includes('Richness')) {
          console.log('Setting default index to Richness');
          dispatch(setSelectedIndices(['Richness']));
        } else {
          console.log('Richness index not found in:', indices);
        }
      } else {
        throw new Error('No data in results response');
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: errorMessage,
        url: `${config.phylonextWebservice}/api/phylonext/jobs/${jobId}/output/02.Diversity_estimates/diversity_estimates.geojson`
      });
      dispatch(setError('Failed to fetch results: ' + errorMessage));
      dispatch(setPipelineStatus('failed'));
    }
  }, [dispatch]);

  useEffect(() => {
    let pollTimer;

    const pollJobStatus = async () => {
      if (!jobId) {
        console.log('No job ID provided');
        return;
      }

      try {
        // Check job status
        const statusUrl = `${config.phylonextWebservice}/api/phylonext/jobs/${jobId}`;
        console.log(`Polling status for job ${jobId} from ${statusUrl}`);
        const response = await axiosWithAuth.get(statusUrl);
        console.log('Job status response:', response.data);

        const jobStatus = response.data?.status?.toLowerCase();
        const exitCode = response.data?.exitCode;
        const completed = response.data?.completed;

        if (jobStatus === 'error' || exitCode === 1) {
          console.error('Pipeline failed:', response.data);
          dispatch(setError(response.data?.message || 'Pipeline execution failed'));
          dispatch(setPipelineStatus('failed'));
          return;
        }

        if (completed || jobStatus === 'complete' || jobStatus === 'completed') {
          console.log('Pipeline completed successfully');
          dispatch(setPipelineStatus('completed'));
          
          // Wait a moment to ensure files are written
          await new Promise(resolve => setTimeout(resolve, 2000));
          await fetchResults(jobId);
        } else {
          console.log(`Job status: ${jobStatus}, continuing to poll...`);
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: errorMessage,
          jobId,
          url: `${config.phylonextWebservice}/api/phylonext/jobs/${jobId}`
        });

        // For 404, check if it's a temporary state during initialization
        if (error.response?.status === 404) {
          console.log('Job not found yet, might be initializing...');
          return;
        }

        // For network errors or other temporary issues, continue polling
        if (error.code === 'ERR_NETWORK' || error.response?.status >= 500) {
          console.log('Temporary error, continuing to poll...');
          return;
        }

        // For persistent errors after multiple attempts, set failed status
        dispatch(setError('Failed to check job status: ' + errorMessage));
        dispatch(setPipelineStatus('failed'));
      }
    };

    if (jobId && status === 'running') {
      console.log('Starting job status polling for job:', jobId);
      pollTimer = setInterval(pollJobStatus, POLL_INTERVAL);
      // Initial poll
      pollJobStatus();
    }

    return () => {
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [jobId, status, dispatch, fetchResults]);

  return null;
};

export default JobStatusPoller; 