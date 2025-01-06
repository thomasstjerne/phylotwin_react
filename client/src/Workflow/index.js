import React, { useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { Box } from "@mui/material";
import MapContainer from "../Components/Map/MapContainer";
import Form from "../Form";
import Run from "../Run";
import Results from "../Results";
import withContext from "../Components/hoc/withContext";

const Workflow = ({ step, setStep, runID, setRunID }) => {
    const params = useParams();
    const { viewMode } = useOutletContext();

    useEffect(() => {
        if (params?.id) {
            setStep(1);
        }
    }, [params?.id, setStep]);

    const renderContent = () => {
        switch (step) {
            case 0:
                return viewMode === 'map' ? (
                    <Box sx={{ width: '100%', height: 'calc(100vh - 64px)' }}>
                        <MapContainer />
                    </Box>
                ) : (
                    <Form viewMode={viewMode} />
                );
            case 1:
                return <Run />;
            case 2:
                return <Results viewMode={viewMode} />;
            default:
                return null;
        }
    };

    return renderContent();
};

const mapContextToProps = ({ step, setStep, runID, setRunID }) => ({
    step, setStep, runID, setRunID 
});

export default withContext(mapContextToProps)(Workflow);
