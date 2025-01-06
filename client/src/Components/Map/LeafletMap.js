import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix Leaflet's default icon issue
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const LeafletMap = () => {
    const [map, setMap] = useState(null);

    // Update map when container size changes
    useEffect(() => {
        if (map) {
            const resizeObserver = new ResizeObserver(() => {
                map.invalidateSize();
            });
            
            const container = map.getContainer();
            resizeObserver.observe(container);

            return () => {
                resizeObserver.disconnect();
            };
        }
    }, [map]);

    const eventHandlers = useMemo(() => ({
        load: (e) => {
            setMap(e.target);
            setTimeout(() => {
                e.target.invalidateSize();
            }, 100);
        }
    }), []);

    return (
        <MapContainer
            center={[0, 0]}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
            whenReady={eventHandlers.load}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
        </MapContainer>
    );
};

export default LeafletMap; 