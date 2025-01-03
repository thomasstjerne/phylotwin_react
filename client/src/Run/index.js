import React, { useState, useEffect, useMemo } from "react";
import { Progress, Row, Col, Timeline, Button, Popconfirm } from "antd";
import { useParams } from "react-router-dom";
import config from "../config";
import axios from "axios";
import withContext from "../Components/hoc/withContext";
import { refreshLogin } from "../Auth/userApi";
import { axiosWithAuth } from "../Auth/userApi";

const PhyloNextJob = ({ setStep }) => {
  const [stdout, setStdout] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [steps, setSteps] = useState([]);
  let params = useParams();


  useEffect(() => {

    let hdl;
    let refreshUserHdl;
    const getData = async (hdl_) => {
      try {
        setLoading(true);
        const res = await axios(
          `${config.phylonextWebservice}/job/${params?.id}`
        );
        if (res?.data?.stdout) {
          let processed = processStdout(res?.data?.stdout);
          setStdout(processed);

        }
        if (res?.data?.completed) {
          if (hdl_) {
            clearInterval(hdl_);
          }
          setStep(2);
        }
        setLoading(false);

      } catch (error) {
        console.log(error);
        setLoading(false);
        if (error?.response?.status !== 404 && hdl_) {
          clearInterval(hdl_);
        } else if (error?.response?.status === 404 && hdl_) {
          const res = await axios(`${config.phylonextWebservice}/job/${params?.id}/pdf`)
          if (res?.data.length > 0) {
            clearInterval(hdl_);
            setStep(2);
          }

        }
      }
    };
    hdl = setInterval(() => getData(hdl), 1000);
    refreshUserHdl = setInterval(refreshLogin, 900000);
    return () => {
      if (hdl) {
        clearInterval(hdl);
      }
      if (refreshUserHdl) {
        clearInterval(refreshUserHdl);
      }
    };
  }, []);


  const abortRun = async jobId => {
    try {
      setStdout("Run aborted by user")
      await axiosWithAuth.put(`${config.phylonextWebservice}/job/${jobId}/abort`)
      setStdout("Run aborted by user")
    } catch (error) {

      console.log(error)
    }
  }

  const processSteps = (process) => {
    const steps_ = [...process].map((e) => {
      let splitted = e[1].split(" process > ");
      var matches = splitted[1].match(/\[(.*?)%\]/);
      let progress;
      if (matches?.[1]) {
        progress = Number(matches[1].trim());
        //console.log(procent.trim())
      }
      const completed = e[1].indexOf("✔") > -1;
      const failed = e[1].indexOf("✘") > -1;
      return {
        name: e[0],
        progress,
        state: failed ? "failed" : completed ? "completed" : "running"
      };
    });

    const currentStep = [...process.values()].findIndex(
      (e) => e.indexOf("✔") === -1
    );
    if (currentStep > -1) {
      setCurrentStep(currentStep);
    } else {
      setCurrentStep(process.size - 1);
    }
    setSteps(steps_);
    //console.log(steps_)
  };
  const processStdout = (data) => {
    const lines = data.reduce((acc, e) => [...acc, ...e.split("\n")], []);
    const c = lines.reduce(
      (acc, e) =>
        e ===
          "===================================================================="
          ? acc + 1
          : acc,
      0
    );
    if (c === 3) {
      const idx = lines.findLastIndex(
        (e) =>
          e ===
          "===================================================================="
      );
      const index = idx - 1;
      let first = lines.slice(0, idx);
      let rest = lines.slice(index);
      let executor = "";
      const process = new Map();
      let resultLine = "\n";
      rest.forEach((p) => {
        if (p.startsWith("executor >")) {
          executor = p;
        } else if (p.indexOf("process > ") > -1 && !p.startsWith('Error')) {
          let splitted = p.split(" process > ");
          process.set(splitted[1].split(" ")[0], p);
        } else if (p) {
          resultLine += `${p}\n`;
        }
      });

      processSteps(process);
      return (
        first.filter((l) => !!l).join("\n") +
        "\n\n====================================================================\n\n" +
        [executor, ...process.values()].join("\n") +
        resultLine
      );
    } else {
      return data.join("");
    }
  };



  const getStepColor = (stp, idx) => {

    if (stp?.state === "completed") {
      return "green"
    } else if (stp?.state === "failed") {
      return "red"
    }
    else if (idx > currentStep) {
      return "gray"
    } else if (idx === currentStep && !stp?.state) {
      return "blue"
    } else if (idx === currentStep) {
      return "blue"
    }
  }

  return (
    <Row>
      <Col span={20} >
        <div
          style={{
            margin: "0 0.2em",
            padding: "0.2em 0.4em 0.1em",
            fontSize: "85%",
            background: "rgba(150, 150, 150, 0.1)",
            /* border: 1px solid rgba(100, 100, 100, 0.2); */
            borderRadius: "3px",
          }}
        >
          <pre>{stdout}</pre>
        </div>
      </Col>
      <Col span={4} style={{ paddingLeft: '14px' }}>
        <Popconfirm placement="bottomLeft" title={"Are you sure you want to abort this run? (Cannot be undone)"} onConfirm={() => abortRun(params?.id)} okText="Yes" cancelText="No">
          <Button danger >Abort</Button>
        </Popconfirm>
        <Timeline style={{ marginTop: "10px" }}>
          {steps.map((s, i) => {
            return (!isNaN(s.progress) || s?.state === "failed") ? <Timeline.Item color={getStepColor(s, i)} key={s.name} title={s.name} ><div>{s.name} </div> <Progress status={s?.state === "failed" ? "exception" : s.progress < 100 ? "active" : "normal"} percent={s.progress} size="small" /></Timeline.Item> :
              <Timeline.Item color={getStepColor(s, i)} key={s.name} title={s.name} >{s.name} </Timeline.Item>
          }
          )}

        </Timeline>
      </Col>

    </Row>
  );
};

const mapContextToProps = ({ step, setStep, runID, setRunID }) => ({
  step,
  setStep,
  runID,
  setRunID,
});
export default withContext(mapContextToProps)(PhyloNextJob);
