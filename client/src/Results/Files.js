
import React, {useEffect, useState} from "react";
import { useParams } from "react-router-dom";
import axios from "axios"
import Layout from "../Layout/Layout";
import PageContent from "../Layout/PageContent";
import config from "../config";
import {List} from "antd"
import {FilePdfOutlined, FileZipOutlined} from "@ant-design/icons"
 function Files() {
    const [files, setFiles] = useState([])
    let params = useParams()
    useEffect(() => {
        const getFiles = async () => {
            try {
                const res = await  axios(`${config.phylonextWebservice}/job/${params?.id}/pdf`)
                setFiles([`${params?.id}.zip` ,...res.data])
               // console.log(res.data)
            } catch (error) {
                console.log(error)
            }
            
        }
        getFiles()
       

    },[])
  return (
    <List
    bordered
    dataSource={files}
    renderItem={(item) => item.endsWith('.pdf') ? <List.Item>
      <FilePdfOutlined /> <a href={`${config.phylonextWebservice}/job/${params?.id}/pdf/${item}`} >{item}</a>
      </List.Item> : <List.Item>
      <FileZipOutlined /> <a href={`${config.phylonextWebservice}/job/${params?.id}/archive`} >{item}</a>
      </List.Item>}

    />
  );
}

export default Files;
