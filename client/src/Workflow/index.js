import React, { useEffect, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { Box } from "@mui/material";
import Form from "../Form";
import Run from "../Run";
import Results from "../Results";
import withContext from "../Components/hoc/withContext";
import { useDispatch } from "react-redux";
import { setGeoJSON, setPipelineStatus, setJobId, setResultsError } from "../store/actions";
import axiosWithAuth from "../utils/axiosWithAuth";
import config from "../config";

const Workflow = ({ step, setStep, runID, setRunID }) => {
    const params = useParams();
    const { isSettingsPanelOpen } = useOutletContext();
    const dispatch = useDispatch();
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    useEffect(() => {
        // Set initial step based on URL params
        if (params?.id) {
            setStep(1); // Run view
        } else {
            setStep(0); // Form view
        }
        console.log("Workflow mounted with step:", step, "and params:", params);
    }, [params?.id, setStep]);

    useEffect(() => {
        if (params?.id) {
            // Load existing results
            const loadExistingResults = async () => {
                try {
                    // Fetch GeoJSON results
                    const response = await axiosWithAuth.get(
                        `${config.phylonextWebservice}/job/${params.id}/results`
                    );
                    
                    // Update visualization state with loaded results
                    dispatch(setGeoJSON(response.data));
                    dispatch(setPipelineStatus('completed'));
                    dispatch(setJobId(params.id));
                    
                    // Switch to visualization panel
                    setIsPanelOpen(true);
                } catch (error) {
                    console.error('Failed to load results:', error);
                    dispatch(setPipelineStatus('failed'));
                    dispatch(setResultsError('Failed to load results'));
                }
            };
            
            loadExistingResults();
        }
    }, [params?.id, dispatch]);

    // Debug logging
    console.log("Current step:", step);
    console.log("Current runID:", runID);

    // Handle panel open/close
    const handlePanelOpen = (panel) => {
        if (panel === 'visualization') {
            setIsPanelOpen(true);
        }
    };

    // Render the workflow content (Form, Run, or Results)
    const renderWorkflowContent = () => {
        switch (step) {
            case 0:
                return <Form />;
            case 1:
                return <Run onPanelOpen={handlePanelOpen} />;
            case 2:
                return <Results />;
            default:
                console.log("No matching step found:", step);
                return <Form />; // Default to Form view
        }
    };

    return (
        <Box sx={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: 2
        }}>
            {renderWorkflowContent()}
        </Box>
    );
};

const mapContextToProps = ({ step, setStep, runID, setRunID }) => ({
    step, setStep, runID, setRunID 
});

export default withContext(mapContextToProps)(Workflow);
