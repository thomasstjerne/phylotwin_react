import React, { useState, useEffect, useMemo } from "react";
import Layout from "../Layout/Layout";
import PageContent from "../Layout/PageContent";
import { Space, Typography, Tabs, Steps } from 'antd';
import { useLocation, useNavigate, useParams } from "react-router-dom";
import config from "../config";
import axios from "axios";
import Form from "../Form";
import Run from "../Run"
import Results from "../Results"

import withContext from "../Components/hoc/withContext";
const { Text, Link } = Typography;
const { Step } = Steps;



const Workflow = ({step, setStep, runID, setRunID}) => {
    let params = useParams();

    useEffect(() => {
        if(params?.id){
            setStep(1)
        } 
    },[])

    return <Layout>
    <PageContent>
        {step === 0 && <Form />}
        {step === 1 && <Run  />}
        {step === 2 && <Results />}
     
  </PageContent>
  </Layout>

}

const mapContextToProps = ({ step, setStep, runID, setRunID }) => ({
    step, setStep, runID, setRunID 
  });
export default withContext(mapContextToProps)(Workflow);
