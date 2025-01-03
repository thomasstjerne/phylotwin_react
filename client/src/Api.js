import axios from "axios";
import config from "./config";

export const getTrees = () => {
    return axios(`${config.phylonextWebservice}/phy_trees`);
  };