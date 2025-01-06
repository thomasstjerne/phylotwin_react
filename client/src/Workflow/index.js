import React, { useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { Box } from "@mui/material";
import Form from "../Form";
import Run from "../Run";
import Results from "../Results";
import withContext from "../Components/hoc/withContext";

const Workflow = ({ step, setStep, runID, setRunID }) => {
    const params = useParams();
    const { isSettingsPanelOpen } = useOutletContext();

    useEffect(() => {
        // Set initial step based on URL params
        if (params?.id) {
            setStep(1); // Run view
        } else {
            setStep(0); // Form view
        }
        console.log("Workflow mounted with step:", step, "and params:", params);
    }, [params?.id, setStep]);

    // Debug logging
    console.log("Current step:", step);
    console.log("Current runID:", runID);

    // Render the workflow content (Form, Run, or Results)
    const renderWorkflowContent = () => {
        switch (step) {
            case 0:
                return <Form />;
            case 1:
                return <Run />;
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
