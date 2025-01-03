
import React, {useEffect, useState} from "react";
import { useParams } from "react-router-dom";
import axios from "axios"
import Layout from "../Layout/Layout";
import PageContent from "../Layout/PageContent";
import PhyloTree from "../Components/Phylotree";
import config from "../config";
import {Spin, Row, Col} from "antd"
 function Tree() {
    const [nwk, setNwk] = useState(null)
    let params = useParams()
    useEffect(() => {
        const getTree = async () => {
            try {
                const res = await  axios(`${config.phylonextWebservice}/job/${params?.id}/tree`)
                setNwk(res.data)
               // console.log(res.data)
            } catch (error) {
                console.log(error)
            }
            
        }
        getTree()
       

    },[])
  return nwk ? <PhyloTree nwk={nwk} /> : <Row><Col flex="auto"></Col><Col><Spin></Spin></Col><Col flex="auto"></Col></Row>;
}

export default Tree;
