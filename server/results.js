"use strict";
const _ = require("lodash");
const config = require("./config");
const fs = require("fs");
const auth = require("./Auth/auth");
const db = require("./db");

module.exports = (app) => {
  // Pipeline DAG visualization
  app.get("/phylonext/job/:jobid/pipeline_dag.dot", function (req, res) {
    if (!req.params.jobid) {
      res.sendStatus(404);
    } else {
      fs.readdir(
        `${config.OUTPUT_PATH}/${req.params.jobid}/output/pipeline_info`,
        function (err, fileList) {
          if (err) {
            res.sendStatus(500);
          } else {
            const dot = fileList.find((file) => file.endsWith(".dot"));
            if (dot) {
              fs.createReadStream(
                `${config.OUTPUT_PATH}/${req.params.jobid}/output/pipeline_info/${dot}`
              ).pipe(res);
            } else {
              res.sendStatus(500);
            }
          }
        }
      );
    }
  });

  // Pipeline execution report
  app.get("/phylonext/job/:jobid/execution_report.html", function (req, res) {
    if (!req.params.jobid) {
      res.sendStatus(404);
    } else {
      fs.readdir(
        `${config.OUTPUT_PATH}/${req.params.jobid}/output/pipeline_info/`,
        function (err, fileList) {
          if (err) {
            res.sendStatus(500);
          } else {
            const html = fileList.find(
              (file) =>
                file.startsWith("execution_report") && file.endsWith(".html")
            );
            if (html) {
              try {
                fs.createReadStream(
                  `${config.OUTPUT_PATH}/${req.params.jobid}/output/pipeline_info/${html}`
                ).pipe(res);
              } catch (error) {
                res.sendStatus(404);
              }
            } else {
              res.sendStatus(500);
            }
          }
        }
      );
    }
  });

  // Get phylogenetic tree
  app.get("/phylonext/job/:jobid/tree", function (req, res) {
    if (!req.params.jobid) {
      res.sendStatus(404);
    } else {
      fs.readdir(
        `${config.OUTPUT_PATH}/${req.params.jobid}/output/`,
        function (err, fileList) {
          if (err) {
            res.sendStatus(404);
          } else {
            const tree = fileList.find((file) => file === `input_tree.nwk`);
            if (tree) {
              try {
                fs.createReadStream(
                  `${config.OUTPUT_PATH}/${req.params.jobid}/output/input_tree.nwk`
                ).pipe(res);
              } catch (error) {
                res.sendStatus(500);
              }
            } else {
              res.sendStatus(404);
            }
          }
        }
      );
    }
  });

  // Get available phylogenetic trees
  app.get("/phylonext/phy_trees", function (req, res) {
    fs.readdir(`${config.TEST_DATA}/phy_trees`, function (err, fileList) {
      if (err) {
        res.sendStatus(404);
      } else {
        const trees = fileList.filter((file) => file.endsWith(".nwk") || file.endsWith(".tre"));
        if (trees) {
          try {
            res.json(trees);
          } catch (error) {
            res.sendStatus(500);
          }
        } else {
          res.sendStatus(404);
        }
      }
    });
  });

  // Get specific phylogenetic tree
  app.get("/phylonext/phy_trees/:tree", function (req, res) {
    fs.readdir(`${config.TEST_DATA}/phy_trees`, function (err, fileList) {
      if (err) {
        res.sendStatus(404);
      } else {
        const tree = fileList.find((file) => file === req.params.tree);
        if (tree) {
          try {
            fs.createReadStream(`${config.TEST_DATA}/phy_trees/${tree}`).pipe(res);
          } catch (error) {
            res.sendStatus(500);
          }
        } else {
          res.sendStatus(404);
        }
      }
    });
  });

  // Get user's runs
  app.get("/phylonext/myruns", auth.appendUser(), function (req, res) {
    try {
      db.read();
      const runs = db.get("runs").filter({ username: req.user?.userName });
      res.json(runs.reverse());
    } catch (error) {
      res.sendStatus(404);
    }
  });

  // Get GeoJSON results
  app.get("/api/phylonext/jobs/:jobid/output/02.Diversity_estimates/diversity_estimates.geojson", function (req, res) {
    console.log('\n=== GEOJSON REQUEST ===');
    console.log('Job ID:', req.params.jobid);
    
    if (!req.params.jobid) {
      console.log('No job ID provided');
      res.sendStatus(404);
    } else {
      const filePath = `${config.OUTPUT_PATH}/${req.params.jobid}/output/02.Diversity_estimates/diversity_estimates.geojson`;
      console.log('Attempting to serve GeoJSON from:', filePath);
      
      // Check if file exists
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          console.error('GeoJSON file not found:', filePath);
          console.error('Error:', err.message);
          res.sendStatus(404);
        } else {
          try {
            console.log('GeoJSON file found, streaming to client');
            fs.createReadStream(filePath)
              .on('error', (error) => {
                console.error('Error streaming GeoJSON:', error);
                res.sendStatus(500);
              })
              .pipe(res);
          } catch (error) {
            console.error('Error serving GeoJSON:', error);
            res.sendStatus(500);
          }
        }
      });
    }
  });
};
