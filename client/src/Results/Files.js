import React from "react";
import { useParams } from "react-router-dom";
import { List } from "antd";
import { FileZipOutlined } from "@ant-design/icons";
import config from "../config";

function Files() {
    const params = useParams();
    const fileName = `phylotwin-run-${params?.id}.zip`;

    return (
        <List
            bordered
            dataSource={[fileName]}
            renderItem={(item) => (
                <List.Item>
                    <FileZipOutlined /> 
                    <a href={`${config.phylonextWebservice}/api/phylonext/runs/job/${params?.id}/archive`}>
                        {item}
                    </a>
                </List.Item>
            )}
        />
    );
}

export default Files;
