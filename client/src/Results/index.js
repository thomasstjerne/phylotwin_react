import React, { useState, useEffect, useMemo } from "react";
import Layout from "../Layout/Layout";
import PageContent from "../Layout/PageContent";
import { Popconfirm, Typography, Tabs, Button, Row, Col } from 'antd';
import {DownloadOutlined, InfoCircleOutlined} from "@ant-design/icons"
import { Doi } from "../Components/Doi";
import { useParams, useNavigate } from "react-router-dom";
import config from "../config";
import axios from "axios";
import { axiosWithAuth } from "../Auth/userApi";
import Iframe from 'react-iframe'
import PipeLineDag from "./PipeLineDag";
import CitationForm from "../Components/Citation/CitationModal";
import Tree from "./Tree"
const { Text, Link } = Typography;

const PhyloNextResults = () => {
  
const [mapExists, setMapExists] = useState(false)
const [activeKey, setActiveKey] = useState("1")
const [run, setRun] = useState({})
const [citationFormOpen, setCitationFormOpen ] = useState(false);
const navigate = useNavigate()
  let params = useParams();
  const getRun = async () => {
    try {
      const res = await axios(
        `${config.phylonextWebservice}/job/${params?.id}`
      );
      setRun(res?.data)
    } catch (error) {
      setRun({})  
    }
}

  useEffect(() => {

    const checkMapExists = async () => {
        try {
            const res = await axios.head(`${config.phylonextWebservice}/job/${params?.id}/cloropleth.html`);
            if (res?.status === 200){
                setMapExists(true)
            };
        } catch (error) {
            setActiveKey("2")
            setMapExists(false)
        }
    }
    checkMapExists()
    getRun()
  },[])
  

  const deleteRun = async jobId => {
    try {
        await axiosWithAuth.delete(`${config.phylonextWebservice}/job/${jobId}`)
        navigate("/myruns")
        // console.log(res.data)
    } catch (error) {
        
        console.log(error)
    }
}


  return (
   <>
    <CitationForm jobid={params?.id} defaultValues={run} open={citationFormOpen} onCancel={()=> setCitationFormOpen(false)} onFinish={(r) => {setRun(r); setCitationFormOpen(false)}}/>
    
        <Tabs
    //defaultActiveKey={mapExists ? "1": "2"}
    activeKey={activeKey}
    onChange={setActiveKey}
    tabBarExtraContent={
      {
        right: <>
          {run?.doi && <>Cite: <Doi id={run?.doi}  /> </>}
          {mapExists && !run?.doi &&  <Button onClick={() => setCitationFormOpen(true)}>Cite</Button> }
          <Button style={{marginLeft: "10px"}} href={`${config.phylonextWebservice}/job/${params?.id}/archive.zip`}>Download results <DownloadOutlined /></Button>
          <Popconfirm placement="bottomLeft" title={"Are you sure you want to delete this run? (Cannot be undone)"} onConfirm={() => deleteRun(params?.id)} okText="Yes" cancelText="No">
          <Button style={{marginLeft: "8px"}} danger >Delete</Button>
        </Popconfirm>
          </>
      }
    }
    items={[
      
      {
        label: `Map`,
        key: '1',
        disabled: !mapExists,
        children: <><Row><Col flex="auto"></Col><Col><Button href="https://phylonext.github.io/biodiverse/#diversity-indices" target="_blank" type="link"><InfoCircleOutlined/> How to interpret this map</Button></Col></Row><Iframe url={`${config.phylonextWebservice}/job/${params?.id}/cloropleth.html`}
        width="100%"
        height="700px"
        id=""
        className=""
        display="block"
        position="relative"/></>,
      },
      {
        label: `Execution report`,
        key: '2',
       // disabled: !completed,
        children: <Iframe url={`${config.phylonextWebservice}/job/${params?.id}/execution_report.html`}
        width="100%"
        height="700px"
        id=""
        className=""
        display="block"
        position="relative"/>,
      },
      {
        label: `Pipeline visualization (DAG)`,
        key: '3',
        //disabled: !completed,
        children: <PipeLineDag jobid={params?.id} />,
      },
      /*  {
        label: `Phylogenetic tree`,
        key: '4',
        children: <Tree  />,
      },  */
    ]}
  />
  </>

    
  );
};

export default PhyloNextResults;
