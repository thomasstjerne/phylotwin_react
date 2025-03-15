import React, { useEffect, useState, useCallback } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { Box } from "@mui/material";
import Form from "../Form";
import Map from "../Components/Map/Map";
import withContext from "../Components/hoc/withContext";
import { useDispatch, useSelector } from "react-redux";
import { 
    setGeoJSON, 
    setPipelineStatus, 
    setJobId, 
    setResultsError, 
    setIndices, 
    resetResults,
    resetVisualization,
    resetMapState,
    updateMapCenter,
    updateMapZoom
} from "../store/actions";
import axiosWithAuth from "../utils/axiosWithAuth";
import config from "../config";
import diversityIndices from '../shared/vocabularies/diversityIndices.json';

const Workflow = ({ step, setStep, runID, setRunID }) => {
    const params = useParams();
    const { handlePanelOpen } = useOutletContext();
    const dispatch = useDispatch();
    const status = useSelector(state => state.results.status);
    const currentJobId = useSelector(state => state.results.jobId);
    const [isLoading, setIsLoading] = useState(false);

    // Reset states and set up initial configuration
    useEffect(() => {
        const setupInitialState = async () => {
            if (params?.id) {
                console.log('Setting up for historical run:', params.id);
                // Only reset if we're loading a different run
                if (params.id !== currentJobId) {
                    console.log('Resetting states for new run');
                    await Promise.all([
                        dispatch(resetResults()),
                        dispatch(resetVisualization()),
                        dispatch(resetMapState()),
                        dispatch(updateMapCenter([20, 0])),
                        dispatch(updateMapZoom(2))
                    ]);
                }
                setStep(1); // Run view
                setRunID(params.id); // Set the runID from params
            } else if (status === 'idle') {
                console.log('Setting up for new analysis');
                await Promise.all([
                    dispatch(resetResults()),
                    dispatch(resetVisualization()),
                    dispatch(resetMapState()),
                    dispatch(updateMapCenter([20, 0])),
                    dispatch(updateMapZoom(2))
                ]);
                setStep(0); // Form view
                setRunID(null); // Clear runID
                handlePanelOpen('settings');
            }
        };

        setupInitialState();
    }, [params?.id, currentJobId, status, setStep, setRunID, handlePanelOpen, dispatch]);

    // Handle data loading separately
    useEffect(() => {
        const loadHistoricalRun = async () => {
            // Skip loading if:
            // 1. No params.id
            // 2. Already loading this run (status is running)
            // 3. Already completed loading this run (status is completed AND jobId matches)
            // 4. Currently in loading state
            if (!params?.id || 
                isLoading || 
                (status === 'completed' && currentJobId === params.id) ||
                (status === 'running' && currentJobId === params.id)) {
                console.log('Skipping data load:', {
                    paramsId: params?.id,
                    isLoading,
                    status,
                    currentJobId,
                    reason: 'Already loading or completed'
                });
                return;
            }

            try {
                setIsLoading(true);
                console.log('Loading historical run data:', params.id);
                
                // Set loading status before fetching
                dispatch(setPipelineStatus('running'));
                dispatch(setJobId(params.id));
                
                const response = await axiosWithAuth.get(
                    `${config.phylonextWebservice}/api/phylonext/runs/job/${params.id}/results`
                );
                
                const geoJSON = response.data;
                console.log('Received GeoJSON data:', {
                    type: geoJSON.type,
                    featureCount: geoJSON.features?.length,
                    jobId: params.id
                });

                const properties = geoJSON.features?.[0]?.properties || {};
                const indices = Object.keys(properties).filter(key => 
                    !['h3_index', 'NumRecords', 'Redundancy'].includes(key)
                );

                console.log('Found indices in GeoJSON:', indices);
                
                // Map GeoJSON property names to indices in the vocabulary
                const allIndices = diversityIndices.groups.flatMap(group => group.indices);
                const mappedIndices = indices.map(indexName => {
                  // Try to find a matching index in the vocabulary
                  const matchingIndex = allIndices.find(index => {
                    if (Array.isArray(index.resultName)) {
                      return index.resultName.includes(indexName);
                    }
                    return index.resultName === indexName;
                  });
                  
                  return {
                    name: indexName,
                    mappedTo: matchingIndex ? matchingIndex.id : null,
                    displayName: matchingIndex ? matchingIndex.displayName : indexName
                  };
                });
                
                console.log('Mapped indices to vocabulary:', mappedIndices);
                
                // Update visualization data
                await Promise.all([
                    dispatch(setIndices(indices)),
                    dispatch(setGeoJSON(response.data)),
                    dispatch(setPipelineStatus('completed'))
                ]);
                
                handlePanelOpen('visualization');
            } catch (error) {
                console.error('Failed to load results:', error);
                dispatch(setPipelineStatus('failed'));
                dispatch(setResultsError(error.message || 'Failed to load results'));
            } finally {
                setIsLoading(false);
            }
        };

        // Load data if needed
        if (params?.id) {
            loadHistoricalRun();
        }
    }, [params?.id, dispatch, handlePanelOpen, status, isLoading, currentJobId]);

    // Debug logging
    useEffect(() => {
        console.log("Workflow state:", {
            step,
            params,
            status,
            runID,
            isLoading,
            currentJobId
        });
    }, [step, params, status, runID, isLoading, currentJobId]);

    // Render the workflow content (Form or Map)
    const renderWorkflowContent = () => {
        switch (step) {
            case 0:
                return <Form />;
            case 1:
                return <Map key={params?.id} />;
            default:
                return <Form />;
        }
    };

    return (
        <Box sx={{ width: '100%', height: '100%' }}>
            {renderWorkflowContent()}
        </Box>
    );
};

// Map context props to component props
const mapContextToProps = ({ step, setStep, runID, setRunID }) => ({
    step,
    setStep,
    runID,
    setRunID
});

export default withContext(mapContextToProps)(Workflow);
