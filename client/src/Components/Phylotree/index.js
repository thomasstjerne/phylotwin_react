import React, { useEffect, useState, useRef } from "react";
import { phylotree } from "phylotree";


/*
 $("[data-direction]").on("click", function(e) {
        var which_function =
          $(this).data("direction") == "vertical"
            ? tree.display.spacing_x.bind(tree.display)
            : tree.display.spacing_y.bind(tree.display);
        which_function(which_function() + +$(this).data("amount")).update();
      });
*/


const PhyloTree = ({ nwk, radial, alignTips, spacingX = 14, spacingY = 30, asc, onNodeClick }) => {
  const [tree, setTree] = useState(null);
  const [asc_, setAsc_] = useState(null);
  const elm = useRef(null) ;

  const init = () => {

 /*      try {
        setNwk_(nwk)
       // document.getElementById('tree_container').innerHTML = "";
      } catch (error) {
        // ingore
      } */
      
      try {
        const tree_ = new phylotree(nwk);
        setTree(tree_);
        tree_.render({
          container: "#tree_container",
          "max-radius": 468,
        //  zoom: true,
          //'show-menu': false,
      /*    align-tips: false
annular-limit: 0.38196601125010515
attribute-list: []
binary-selectable: false
bootstrap: false
branches: "step"
brush: true
collapsible: true
color-fill: true
compression: 0.2
container: "#tree_container"
draw-size-bubbles: false
edge-styler: null
hide: true
internal-names: false
is-radial: false
label-nodes-with-name: false
layout: "left-to-right"
left-offset: 0
left-right-spacing: "fixed-step"
logger: console {debug: ƒ, error: ƒ, info: ƒ, log: ƒ, warn: ƒ, …}
max-radius: 768
maximum-per-level-spacing: 100
maximum-per-node-spacing: 100
minimum-per-level-spacing: 10
minimum-per-node-spacing: 2
node-span: null
node-styler: (element, data) => {…}
node_circle_size: ƒ ()
reroot: true
restricted-selectable: false
scaling: true
selectable: true
show-labels: true
show-menu: true
show-scale: "top"
top-bottom-spacing: "fixed-step"
transitions: null
zoom: false */
          'node-styler': (element, data) => {
            element.on('click', function(e) {
              if(typeof onNodeClick === 'function'){
                onNodeClick(data)
              }
              data.selected_xx = true;
              console.log(data)
              // tree.getNodeById(data.data.id)
             // console.log(tree.getNodeByName(data.data.name))
              });
          }
        });
        elm?.current?.append(tree_.display.show())
        
      } catch (err) {
        console.log(err);
      }
  }

  useEffect(() => {
    
if(nwk){
  init()
}
     
    
    
  }, [nwk, onNodeClick, init]);
  useEffect(()=>{
    if(tree){
        tree.display.radial(radial).update();
    }
  }, [radial, tree])
  useEffect(()=>{
    if(tree){
        tree.display.alignTips(alignTips).update();
    }
  }, [alignTips, tree])
  useEffect(()=>{
    if(tree){
        tree.display.spacing_x(spacingX).update()
    }
  }, [spacingX, tree])
  useEffect(()=>{
    if(tree){
        console.log(tree.display.spacing_y())
        tree.display.spacing_y(spacingY).update()
    }
  }, [spacingY, tree])

  useEffect(()=>{
    if(tree && asc != null){
      setAsc_(asc)
      tree.resortChildren(function(a, b) {
        return (b.height - a.height || b.value - a.value) * (asc ? 1 : -1);
      });
    } else if(tree && asc_ !== asc) {
      setAsc_(asc)
      setTree(null)
      init()
    }
  }, [asc, asc_, init, tree])


  return <div id="tree_container" ref={elm}  />;
};

export default PhyloTree;
