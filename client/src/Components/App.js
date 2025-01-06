import React from "react";
import { useRoutes } from "react-router-dom";
import Layout from "../Layout/Layout";
import MyRuns from "../MyRuns";
import Home from "../Home";
import Workflow from "../Workflow";

// Import styles
import 'antd/dist/reset.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import "../App.css";

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

export default App; 