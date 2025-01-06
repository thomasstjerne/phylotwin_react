import React, { useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
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

    return (
        <div>
            {step === 0 && <Form viewMode={viewMode} />}
            {step === 1 && <Run />}
            {step === 2 && <Results viewMode={viewMode} />}
        </div>
    );
};

const mapContextToProps = ({ step, setStep, runID, setRunID }) => ({
    step, setStep, runID, setRunID 
});

export default withContext(mapContextToProps)(Workflow);
