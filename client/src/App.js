import * as React from "react";
import ContextProvider from "./Components/hoc/ContextProvider";
import { BrowserRouter as Router, useRoutes } from "react-router-dom";
import Layout from "./Layout/Layout";
import MyRuns from "./MyRuns";
import Home from "./Home";
import Workflow from "./Workflow";
import history from "./history";

// Import styles
import 'antd/dist/reset.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import "./App.css";

const App = () => {
  const routes = useRoutes([
    { 
      path: "/", 
      element: <Layout />,
      children: [
        { path: "", element: <Home /> },
        { path: "run", element: <Workflow /> },
        { path: "run/:id", element: <Workflow /> },
        { path: "myruns", element: <MyRuns /> },
      ]
    },
  ]);

  return routes;
};

const AppWrapper = () => {
  return (
    <ContextProvider>
      <Router history={history}>
        <App />
      </Router>
    </ContextProvider>
  );
};

export default AppWrapper;
