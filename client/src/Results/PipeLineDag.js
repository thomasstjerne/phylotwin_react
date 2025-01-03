import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Graphviz } from "graphviz-react";
import { graphviz } from "d3-graphviz";
import { Button, Row, Col, Spin } from "antd";
import save_svg from "save-svg-as-png";
import axios from "axios";
import config from "../config";


const DagViewer = (props) => {
  const [dot, setDot] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (props.jobid) {
      getDag(props.jobid);
    }
  }, [props.jobid]);

  const getDag = async (jobid) => {
    try {
      setLoading(true);
      const res = await axios(
        `${config.phylonextWebservice}/job/${jobid}/pipeline_dag.dot`
      );
      setDot(res?.data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };
  // gen css from props
  const { width = "100%", height = "100%", style: orig_style, jobid } = props;

  const style = useMemo(() => {
    return {
      ...orig_style,
      width,
      height,
    };
  }, [orig_style, width, height]);
  const graphvizRoot = useRef(null);

  // update style in Graphviz div
  useEffect(() => {
    if (graphvizRoot.current) {
      const { id } = graphvizRoot.current;
      // use DOM id update style
      const el = document.getElementById(id);
      for (let [k, v] of Object.entries(style)) {
        el.style[k] = v;
      }
    }
  }, [graphvizRoot, style]);
  const reset = useCallback(() => {
    if (graphvizRoot.current) {
      const { id } = graphvizRoot.current;
      graphviz(`#${id}`).resetZoom();
    }
  }, [graphvizRoot]);
  return (
    <div
      style={{
        ...style,
        position: "relative",
      }}
    >
      {loading && (
        <Row>
          <Col flex="auto"></Col>
          <Col>
            <Spin />
          </Col>
          <Col flex="auto"></Col>
        </Row>
      )}
      {dot && !loading && (
        <Row>
          <Col flex="auto"></Col>
          <Col>
            <Button
              type="primary"
              onClick={() => {
                if (graphvizRoot.current) {
                  const { id } = graphvizRoot.current;
                  save_svg.saveSvgAsPng(
                    // workaround: find SVG node
                    document.getElementById(`${id}`).childNodes[0],
                    `dagviewer-export-${jobid}.png`,
                    {
                      scale: 1.0,
                      backgroundColor: "white",
                    }
                  );
                }
              }}
              style={{
                position: "absolute",
                right: "5%",
                top: "15%",
              }}
            >
              Export
            </Button>
          </Col>
        </Row>
      )}
      {dot && !loading && (
        <Graphviz
          dot={dot}
          options={{
            useWorker: false,
            ...style,
            zoom: true,
            ...props,
          }}
          ref={graphvizRoot}
        />
      )}
    </div>
  );
};

export default DagViewer;
