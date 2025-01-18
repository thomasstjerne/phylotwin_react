import React, { useEffect } from "react";
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

const Workflow = ({ step, setStep, runID, setRunID }) => {
    const params = useParams();
    const { handlePanelOpen } = useOutletContext();
    const dispatch = useDispatch();
    const status = useSelector(state => state.results.status);

    // Reset all states when starting a new run (no params.id)
    useEffect(() => {
        if (params?.id) {
            setStep(1); // Run view
            setRunID(params.id); // Set the runID from params
        } else if (status === 'idle') { // Only reset if we're in idle state
            // Clear all states and switch to settings panel for new analysis
            dispatch(resetResults());
            dispatch(resetVisualization());
            dispatch(resetMapState());
            dispatch(updateMapCenter([20, 0]));
            dispatch(updateMapZoom(2));
            setStep(0); // Form view
            setRunID(null); // Clear runID
            handlePanelOpen('settings');
        }
        console.log("Workflow mounted with step:", step, "and params:", params);
    }, [params, setStep, setRunID, step, dispatch, handlePanelOpen, status]);

    // Load results when job ID changes
    useEffect(() => {
        if (params?.id && status !== 'completed') {
            // Load existing results
            const loadExistingResults = async () => {
                try {
                    // Fetch GeoJSON results
                    console.log('Loading results for job:', params.id);
                    const response = await axiosWithAuth.get(
                        `${config.phylonextWebservice}/api/phylonext/runs/job/${params.id}/results`
                    );
                    
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
                    dispatch(setIndices(indices));
                    dispatch(setGeoJSON(response.data));
                    dispatch(setPipelineStatus('completed'));
                    dispatch(setJobId(params.id));
                    
                    // Switch to visualization panel
                    console.log('Opening visualization panel');
                    handlePanelOpen('visualization');
                } catch (error) {
                    console.error('Failed to load results:', error);
                    dispatch(setResultsError(error.message || 'Failed to load results'));
                }
            };
            
            loadExistingResults();
        }
    }, [params?.id, dispatch, handlePanelOpen, status]);

    // Debug logging
    console.log("Current step:", step);
    console.log("Current runID:", runID);

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
