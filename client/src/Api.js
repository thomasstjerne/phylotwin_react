import axios from "axios";
import config from "./config";

const mockTrees = [
  {
    id: 1,
    name: "Sample Tree 1",
    description: "A sample phylogenetic tree for testing"
  },
  {
    id: 2,
    name: "Sample Tree 2",
    description: "Another sample phylogenetic tree"
  }
];

export const getTrees = () => {
  if (process.env.REACT_APP_DEV_MODE === 'true') {
    return Promise.resolve({ data: mockTrees });
  }
  return axios(`${config.phylonextWebservice}/phy_trees`);
};