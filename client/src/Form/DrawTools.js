import React, { useEffect, useState } from "react";
import L from "leaflet";
import {
	Rectangle,
	FeatureGroup,
    useMap
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";

const DrawTools = ({value, onChange}) => {
    const map = useMap();
    const [rect, setRect] = useState(null)
    useEffect(() => {
        console.log(value)
    }, [value])

    

	const handleEdited = (e) => {
		e.layers.eachLayer(layer => {
			onChange(layer.getLatLngs())
		});
	};

	const handleCreated = (e) => {
		let layer = e.layer;
		setRect(layer)
		console.log("coords", layer.getLatLngs());
		onChange(layer.getLatLngs())
	};

	const handleDeleted = (e) => {
		setRect(null)
		e.layers.eachLayer(() => {})
	};

	const handleDrawStart = (e) => {
		console.log("Draw started", e)
	};

	return (
		<FeatureGroup>
			<EditControl
				onDrawStart={handleDrawStart}
				position="topleft"
				onEdited={handleEdited}
				onCreated={handleCreated}
				onDeleted={handleDeleted}
				draw={{
					polyline: false,
					rectangle: rect ? false : {
						icon: new L.DivIcon({
							iconSize: new L.Point(8, 8),
							className: "leaflet-div-icon leaflet-editing-icon"
						}),
						shapeOptions: {
							guidelineDistance: 10,
							color: "navy",
							weight: 3
						}
					},
					circlemarker: false,
					circle: false,
					polygon: false,
                    marker: false
				}}
			/>
		</FeatureGroup>
	);
};

export default DrawTools;
