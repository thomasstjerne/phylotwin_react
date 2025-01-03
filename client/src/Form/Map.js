import React from 'react'
// import { MapContainer } from 'react-leaflet/MapContainer'
import { MapContainer, TileLayer, Rectangle, Popup } from 'react-leaflet'
import { useMap } from 'react-leaflet/hooks'


import DrawTools from './DrawTools';
const css = {
    width: '100%',
    height: '400px',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: '24px'
  }
const LeafletMap = ({value, onChange}) => {


    return   <div style={{minWidth: "300px"}}> <MapContainer style={css}  center={[0, 0]} zoom={1} scrollWheelZoom={false}>
        <DrawTools value={value} onChange={onChange}/>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />

  </MapContainer></div> 
}

export default LeafletMap;