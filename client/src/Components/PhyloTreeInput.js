import React, { useState, useEffect } from "react";
import {Col, Row, Input, Button, Modal} from 'antd'
import PhyloTree from "./Phylotree";
const PhyloTreeInput = ({value = "", onChange}) => {

    const [nwk, setNwk] = useState(value);
    const [showPreview, setShowPreview] = useState(false)
    const [loading, setLoading] = useState(false)

    const onChange_ = (e) => {
        const val = e.target.value;
        setNwk(val)
        onChange(val)
    }

    return <>
    <Modal
    destroyOnClose
    title="Preview Phylogeny" open={showPreview} onOk={() => setShowPreview(false)} onCancel={() => setShowPreview(false)}
    footer={null}
    width={"90%"}    
    >
       {nwk && <PhyloTree nwk={nwk} />}

    </Modal>
    <Row>
        <Col flex="auto">
            <Input.TextArea rows={5} value={nwk} onChange={onChange_}></Input.TextArea></Col>
            <Col style={{paddingLeft: "10px"}}><Button disabled={!nwk} onClick={() => setShowPreview(true)}>Preview</Button></Col>
    </Row>
    
    </>
}

export default PhyloTreeInput;