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

    

	const _onEdited = e => {
		let numEdited = 0;
		e.layers.eachLayer(layer => {
			onChange(layer.getLatLngs())
		});
		// console.log(`_onEdited: edited ${numEdited} layers`, e);

		// this._onChange();
	};

	const _onCreated = e => {
		let layer = e.layer;
		setRect(e.layer)
		console.log("coords", layer.getLatLngs());
        onChange(layer.getLatLngs())
		
	};

	const _onDeleted = e => {
		let numDeleted = 0;
        setRect(null)
		e.layers.eachLayer(layer => {
			numDeleted += 1;
		});
		console.log(`onDeleted: removed ${numDeleted} layers`, e);

		// this._onChange();
	};



	const _onDrawStart = e => {
		console.log("_onDrawStart", e);
	};

	return (
		<FeatureGroup>
			<EditControl
				onDrawStart={_onDrawStart}
				position="topleft"
				onEdited={_onEdited}
				onCreated={_onCreated}
				onDeleted={_onDeleted}
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
