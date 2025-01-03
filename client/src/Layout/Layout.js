import { Breadcrumb, Layout, Menu, Steps, Button, Row, Col } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useMatch } from "react-router-dom";
import withContext from "../Components/hoc/withContext";
import Logo from "./Logo";
import UserMenu from "../Auth/UserMenu";
const { Step } = Steps;

const { Header, Content, Footer } = Layout;

const App = ({ children, step, setStep, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
 /*  const match = useMatch("/run/:id");
  const [current, setCurrent] = useState("");
  useEffect(() => {
    console.log(location);
    setCurrent(location?.pathname);
  }, [location]); */
  
 
  return (
    <Layout className="layout">
      <Header>
        <Row>
          <Col span={1} >
            <Logo />
          </Col>
          <Col flex="auto" style={{ padding: "24px" }}>
            {" "}
            {location?.pathname.startsWith("/run") && (
              <Steps size="small" current={step}>
                <Step title="Configure" /* description="Input parameters" */ />
                <Step title={step === 1 ? "Running Pipeline" : "Run pipeline"} />
                <Step title="Results" />
              </Steps>
            )}
          </Col>
          <Col>
            <Button
              style={{ marginRight: "8px" }}
              disabled={([0, 1].includes(step) && location?.pathname !== "/myruns" && location?.pathname !== "/") || !user}
              type={location?.pathname !== "/run" ? "primary" : "default"}
              onClick={() => {
                setStep(0)
                navigate("/run");
              }}
            >
              Run pipeline
            </Button>
            <Button onClick={() => navigate("/")}>About</Button>
            <UserMenu />
          </Col>
        </Row>

        {/*         <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[current]}
          onClick={onClick}
          defaultSelectedKeys={["2"]}
          items={match ? [...items, { key: `/run/${match?.params?.id}`, label: `Run ${match?.params?.id}` }] : items}
        /> */}
      </Header>
      <Content
        style={{
          padding: "0 50px",
        }}
      >
        {/*       <Breadcrumb
        style={{
          margin: '16px 0',
        }}
      >
        <Breadcrumb.Item>Home</Breadcrumb.Item>
        <Breadcrumb.Item>List</Breadcrumb.Item>
        <Breadcrumb.Item>App</Breadcrumb.Item>
      </Breadcrumb> */}
        <div className="site-layout-content">{children}</div>
      </Content>
      <Footer
        style={{
          textAlign: "center",
        }}
      >
        The work is supported by a grant “PD (Phylogenetic Diversity) in the
        Cloud” to GBIF Supplemental funds from the GEO-Microsoft Planetary
        Computer Programme.
      </Footer>
    </Layout>
  );
};

const mapContextToProps = ({
  step,
  setStep,
  runID,
  setRunID,
  currentTask,
  user
}) => ({
  step,
  setStep,
  runID,
  setRunID,
  currentTask,
  user
});
export default withContext(mapContextToProps)(App);
