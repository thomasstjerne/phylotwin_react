import * as React from "react";
import ContextProvider from "./Components/hoc/ContextProvider";

import { BrowserRouter as Router, useRoutes } from "react-router-dom";
import MyRuns from "./MyRuns";
import Home from "./Home";
import Workflow from "./Workflow";
import history from "./history";
import "./App.css";

const App = () => {
  const routes = useRoutes([
    { path: "/", element: <Home /> },
    { path: "/run", element: <Workflow /> },
    { path: "/run/:id", element: <Workflow /> },
    { path: "/myruns", element: <MyRuns /> },
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
