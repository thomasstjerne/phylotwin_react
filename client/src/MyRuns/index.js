import React, { useState, useEffect, useMemo } from "react";
import Layout from "../Layout/Layout";
import PageContent from "../Layout/PageContent";
import { List, Button, Popconfirm } from "antd";
import { Doi } from "../Components/Doi";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import config from "../config";
import { axiosWithAuth } from "../Auth/userApi";

import withContext from "../Components/hoc/withContext";


const MyRuns = ({ user, logout }) => {

    const [runs, setRuns] = useState([])
    const navigate = useNavigate();
    useEffect(() => {

        getRuns()


    }, [user])

    const getRuns = async () => {
        try {
            const res = await axiosWithAuth(`${config.phylonextWebservice}/myruns`)
            setRuns(res.data)
            // console.log(res.data)
        } catch (error) {
            if (error?.response?.status === 401) {
                logout()
            }
            console.log(error)
        }

    }

    const deleteRun = async jobId => {
        try {
            await axiosWithAuth.delete(`${config.phylonextWebservice}/job/${jobId}`)
            getRuns()
            // console.log(res.data)
        } catch (error) {
            if (error?.response?.status === 401) {
                logout()
            }
            console.log(error)
        }
    }

    const getDescription = item => {
        const relevantKeys = ['phylum', 'order', 'family', 'country', 'latmax', 'latmin', 'lonmax', 'lonmin'];
        const keys = Object.keys(item).filter(key => relevantKeys.includes(key) && !!item[key])
        const params = <span style={{ paddingLeft: '11px' }}>{keys.reduce((acc, curr) => `${acc} -${curr} ${item[curr]}`, `${!item.prepared_phytree ? '-phytree supplied via form' : '-phytree ' + item.prepared_phytree}`)}</span> //keys.reduce((acc, curr) => `${acc} -${curr} ${item[curr]}`, `${!item.prepared_phytree ? '-phytree supplied via form' : '-phytree '+item.prepared_phytree}`);
        return item?.jobDescription ? <><span style={{ paddingLeft: '11px', marginBottom: "4px" }}>{item?.jobDescription}</span><br />{params}</> : params;

    }
    return (
        <Layout>
            <PageContent>
                {user && <h1>{`Finished pipeline runs for ${user?.userName}`}</h1>}
                <List
                    bordered
                    dataSource={runs}
                    renderItem={(item) => <List.Item actions={[
                        <Popconfirm placement="topLeft" title={"Are you sure you want to delete this run? (Cannot be undone)"} onConfirm={() => deleteRun(item.run)} okText="Yes" cancelText="No">
                            <Button type="link" danger >Delete</Button>
                        </Popconfirm>


                    ]}>
                        <List.Item.Meta
                            title={<><Button type="link" onClick={() => navigate(`/run/${item?.run}`)}>{item?.jobName ? `${item?.jobName} (${moment(item?.started).format('LLL')})` : moment(item?.started).format('LLL')}</Button> {item?.doi && <Doi id={item?.doi} />}</>}
                            description={getDescription(item)}
                        >
                        </List.Item.Meta>
                    </List.Item>}

                />
            </PageContent>
        </Layout>
    );



};

const mapContextToProps = ({ user, logout }) => ({
    user, logout
});
export default withContext(mapContextToProps)(MyRuns);
