import { useState, useEffect, useRef } from 'react'
import React from 'react';
import axios from 'axios';
// import { MapContainer } from 'react-leaflet/MapContainer'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { Radio, Select } from "antd";
const { Option } = Select;

const getLevel = (level) => {
    return axios(`/level${level}.geojson`).then(res => res.data)
};
//import React from 'react'
const css = {
    width: '100%',
    height: '400px',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: '24px'
}
const LeafletMap = ({ value, onChange }) => {

    const [level1, setLevel1] = useState(null)
    const [level2, setLevel2] = useState(null)
    const [selectedLevel, setSelectedLevel] = useState(1)
    const valueRef = useRef(value);
    useEffect(() => {
        const init = async () => {
            let level1Data = await getLevel(1)
            let level2Data = await getLevel(2)
            level1Data.features.forEach(f => {
                const phylonextKey = `L1_${f.properties[`LEVEL1_NAM`].replace(/[\s-]/g, "_").replace(/\./g, "")}`;
                console.log(phylonextKey)
                f.properties.phylonextKey = phylonextKey

            })
            level2Data.features.forEach(f => {
                const phylonextKey = `L2_${f.properties[`LEVEL2_NAM`].replace(/[\s-]/g, "_").replace(/\./g, "")}`;
                f.properties.phylonextKey = phylonextKey

            })
            setLevel1(level1Data)
            setLevel2(level2Data)
        }
        init()
    }, [])
    useEffect(() => { 
       valueRef.current = value
    }, [value])

    const onFeatureClick = (phylonextKey) => {
        onChange([...new Set([...(valueRef?.current || []), phylonextKey])])
    }
    function onEachFeature(feature, layer){
        
        layer.on({
          click: () => {
            onFeatureClick(feature.properties.phylonextKey)

                
                console.log(feature.properties.phylonextKey)
          }
        });
      }

    const style = (feature) => {
        return ( value || []).includes(feature.properties.phylonextKey)  ?  {
            fillColor: 'red' 
        } : {
            fillColor: 'blue' 
        };
        
    }  

    return <>
        <Radio.Group onChange={(e) => {
            onChange([])
            setSelectedLevel(e?.target?.value)
        }} value={selectedLevel}>
            <Radio value={1}>Region Level 1</Radio>
            <Radio value={2}>Region Level 2</Radio>
        </Radio.Group>
        {level1 && level2 && <Select
            mode="multiple"
            allowClear
            onChange={onChange}
            value={value}
            showSearch
            style={{marginBottom: "8px"}}
            filterOption={(input, option) => {
                return option.children
                    .toLowerCase()
                    .startsWith(input.toLowerCase());
            }}>
            {(selectedLevel === 2 ? level2.features : level1.features).map((i) => {
                const key = i.properties.phylonextKey;
               // console.log(key)
                return <Option key={key}>{key}</Option>
            })}
        </Select>}
        <MapContainer style={css} center={[0, 0]} zoom={1} scrollWheelZoom={false}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {selectedLevel === 1 && level1 && <GeoJSON  style={style} data={level1} onEachFeature={onEachFeature}/>}
            {selectedLevel === 2 && level2 && <GeoJSON  style={style} data={level2} onEachFeature={onEachFeature}/>}
        </MapContainer>
    </>
}

export default LeafletMap;