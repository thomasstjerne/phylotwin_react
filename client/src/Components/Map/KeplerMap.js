import React from 'react';
import { connect } from 'react-redux';
import { addDataToMap, KeplerGl } from 'kepler.gl';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const MAPBOX_STYLE = 'mapbox://styles/vmikk/cm5l21quj004t01pk52jn3mya';

const KeplerMap = ({ data, config, onMapEngineReady, dispatch }) => {
  React.useEffect(() => {
    if (data) {
      dispatch(
        addDataToMap({
          datasets: [{
            info: {
              label: 'Biodiversity Data',
              id: 'biodiversity'
            },
            data
          }],
          option: {
            centerMap: true,
            readOnly: false
          },
          config: {
            ...config,
            mapStyle: {
              styleType: 'mapbox',
              topLayerGroups: {},
              visibleLayerGroups: {},
              threeDBuildingColor: [209, 206, 199],
              mapStyles: {
                custom: {
                  id: 'custom',
                  label: 'Custom Style',
                  url: MAPBOX_STYLE,
                  icon: 'https://api.mapbox.com/styles/v1/vmikk/cm5l21quj004t01pk52jn3mya/static/-122.3391,37.7922,9,0,0/400x300?access_token=' + MAPBOX_TOKEN,
                  layerGroups: []
                }
              }
            }
          }
        })
      );
    }
  }, [data, config, dispatch]);

  return (
    <KeplerGl
      id="biodiversity-map"
      mapboxApiAccessToken={MAPBOX_TOKEN}
      width="100%"
      height="100%"
      onMapReady={onMapEngineReady}
    />
  );
};

export default connect()(KeplerMap); 