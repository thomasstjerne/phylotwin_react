import React, { useState, useEffect } from "react";
import Layout from "../Layout/Layout";
import PageContent from "../Layout/PageContent";
import country from "../Vocabularies/country.json"
import basisOfRecord from "../Vocabularies/basisOfRecord.json"
import _ from "lodash"
import {
  Form,
  InputNumber,
  Button,
  Select,
  Collapse,
  Typography,
  Checkbox,
  Input,
  Tabs,
  Row,
  Col,
  Radio,
  Upload
} from "antd";
import {InfoCircleOutlined, UploadOutlined} from "@ant-design/icons"
import PhyloTreeInput from "../Components/PhyloTreeInput";
import { useNavigate } from "react-router-dom";
import biodiverseIndices from "../Vocabularies/BiodiverseIndices.json";
import TaxonAutoComplete from "../Components/TaxonAutocomplete";
import { axiosWithAuth } from "../Auth/userApi";

import axios from "axios";
import config from "../config";
import Map from "./Map";
import WGRPD from "./WGRPD"
import withContext from "../Components/hoc/withContext";
import { polygon } from "leaflet";

const { Text } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

const FormItem = Form.Item;
const formItemLayout = {
  labelCol: {
    xs: { span: 16 },
    sm: { span: 8 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 16 },
  },
};

const mapComponentFormItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 24 },
  },
  /*   wrapperCol: {
      xs: { span: 24 },
      sm: { span: 24 },
    }, */
};

const getProfiles = () => {
  return axios(`/profiles.json`).then(res => res.data)
};

const PhyloNextForm = ({ setStep, preparedTrees, user, logout }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [h3resolution, setH3resolution] = useState(3);
  const [profiles, setProfiles] = useState({});
  const [polygonFileList, setPolygonFileList] = useState([]);
  const [randconstrainFileList, setRandconstrainFileList] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const _profiles = await getProfiles()
      setProfiles(_profiles)
    }
    init()
  }, [])

  useEffect(() => {

    if (!user) {
      logout()
    }
  }, [user])
  const onFinishFailed = ({ errorFields }) => {
    form.scrollToField(errorFields[0].name);
  };
  const getCoords = (boundingBox) => {
    return {
      latmin: Math.min(...boundingBox.map((e) => e.lat)),
      latmax: Math.max(...boundingBox.map((e) => e.lat)),
      lonmin: Math.min(...boundingBox.map((e) => e.lng)),
      lonmax: Math.max(...boundingBox.map((e) => e.lng)),
    };
  };
  const getArraryData = (values) => {

    return ["phylum", "classis", "order", "family", "genus", "country", "basisofrecordinclude", "basisofrecordexclude", "regions"].reduce((acc, curr) => {
      if (_.isArray(values[curr]) && values[curr].length > 0) {
        acc[curr] = `"${values[curr].toString()}"`
      }
      return acc;
    }, {})
  }
  const onFinish = async (values) => {
    //  alert(JSON.stringify(values))
    let nonEmptyFields = Object.fromEntries(
      Object.entries(values).filter(
        ([k, v]) => v != null && !["boundingBox", "phylum", "classis", "order", "family", "genus", "country", "basisofrecordinclude", "basisofrecordexclude", "regions", "profile"].includes(k)
      )
    );


    nonEmptyFields = { ...nonEmptyFields, ...getArraryData(values), ...profiles[values.profile] }

   

    if (values?.boundingBox?.[0]) {
      nonEmptyFields = {
        ...nonEmptyFields,
        ...getCoords(values.boundingBox[0])
      };
    }
    if (nonEmptyFields?.regions) {
      nonEmptyFields.wgsrpd = true
    }
    try {
      console.log(nonEmptyFields);
      const formData = new FormData();
      formData.append('data', JSON.stringify(nonEmptyFields))
      if(polygonFileList.length >0){
      formData.append('polygon', polygonFileList[0])
      }
      if(randconstrainFileList.length >0){
        formData.append('randconstrain', randconstrainFileList[0])
        }
      setLoading(true);
      const res = await axiosWithAuth.post(
        `${config.phylonextWebservice}`,
        formData
      );
      const jobid = res?.data?.jobid;
      setStep(1)
      navigate(`/run/${jobid}`);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
   /*  try {
      console.log(nonEmptyFields);

      setLoading(true);
      const res = await axiosWithAuth.post(
        `${config.phylonextWebservice}`,
        nonEmptyFields
      );
      const jobid = res?.data?.jobid;
      setStep(1)
      navigate(`/run/${jobid}`);
    } catch (error) {
      console.log(error);
      setLoading(false);
    } */
  };
  return (

    <Form
      form={form}
      disabled={loading}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      labelWrap={true}
      initialValues={{
        genus: [],
        family: [],
        order: [],
        classis: [],
        phylum: [],
        randname: 'rand_structured',
        h3resolution: 2
      }}
    >
      <Collapse defaultActiveKey={"1"}>
        <Panel header="Name and description" key="0">
          <Form.Item
            {...formItemLayout}
            name="jobName"
            label="Name"
            extra={"You can give your pipeline run a name that will help you distinguish it (Optional)"}
          >
            <Input />
          </Form.Item>
          <Form.Item
            {...formItemLayout}
            name="jobDescription"
            label="Description"
            extra={"Further notes or information about the run (Optional)"}
          >
            <Input.TextArea />
          </Form.Item>
        </Panel>
        <Panel header="Phylogeny" key="1">
          <FormItem
            {...formItemLayout}
            name="phylabels"
            label="Type of phylogenetic tree labels (OTT or Latin)"
          >
            <Select allowClear>
              {["OTT", "Latin"].map((i) => (
                <Option key={i}>{i}</Option>
              ))}
            </Select>
          </FormItem>

          <FormItem
            {...formItemLayout}
            name="taxgroup"
            label="Taxgroup for matching species names to the Open Tree Taxonomy"
          >
            <Select>
              <Option value="'All life'" label="All life ">
                <Text>All life </Text>
                <br />
              </Option>
              <Option value="Animals" label="Animals">
                <Text>Animals</Text>
                <br />
                <Text type="secondary">
                  Birds, Tetrapods, Mammals, Amphibians, Vertebrates
                  Arthropods, Molluscs, Nematodes, Platyhelminthes, Annelids
                  Cnidarians, Arachnids, Insects
                </Text>
              </Option>
              <Option value="Fungi" label="Fungi">
                <Text>Fungi</Text>
                <br />
                <Text type="secondary">Basidiomycetes, Ascomycetes</Text>
              </Option>
              <Option value="'Land plants'" label="Land plants">
                <Text>Land plants</Text>
                <br />
                <Text type="secondary">
                  Hornworts, Mosses, Liverworts, Vascular plants, Club
                  mosses Ferns, Seed plants, Flowering plants, Monocots,
                  Eudicots Rosids, Asterids, Asterales, Asteraceae, Aster
                  Symphyotrichum, Campanulaceae, Lobelia
                </Text>
              </Option>
              <Option value="Bacteria" label="Bacteria">
                <Text>Bacteria</Text>
                <br />
                <Text type="secondary">
                  SAR group, Archaea, Excavata, Amoebozoa, Centrohelida
                  Haptophyta, Apusozoa, Diatoms, Ciliates, Forams
                </Text>
              </Option>

            </Select>
          </FormItem>
          <FormItem
            {...formItemLayout}
            name="prepared_phytree"
            label="Choose a predefined tree from OTL"
            extra={<span>The pipeline comes with <a href="https://github.com/vmikk/PhyloNext/tree/main/test_data/phy_trees" target="_blank">some predefined trees</a> trees from OTL</span>}
          >
            <Select style={{ width: 400 }} allowClear>
              {preparedTrees.map(key => <Option key={key}>{key}</Option>)}
            </Select>
          </FormItem>
          <FormItem
            {...formItemLayout}
            name="phytree"
            label="Phylogenetic tree in newick format (phytree param)"
            extra="You can supply your own tree in Newick format"
          >
            <PhyloTreeInput />
            {/* <Input.TextArea></Input.TextArea> */}
          </FormItem>
        </Panel>
        <Panel header="Taxonomic filters" key="2">
          <FormItem {...formItemLayout} name="phylum" label="Phylum">
            <TaxonAutoComplete rank="phylum" />
          </FormItem>
          <FormItem {...formItemLayout} name="classis" label="Class">
            <TaxonAutoComplete rank="class" />
          </FormItem>
          <FormItem {...formItemLayout} name="order" label="Order">
            <TaxonAutoComplete rank="order" />
          </FormItem>
          <FormItem {...formItemLayout} name="family" label="Family">
            <TaxonAutoComplete rank="family" />
          </FormItem>
          <FormItem {...formItemLayout} name="genus" label="Genus">
            <TaxonAutoComplete rank="genus" />
          </FormItem>
        </Panel>
        <Panel header="Spatial and temporal filters" key="3">
          <FormItem
            {...formItemLayout}
            name="minyear"
            label="Min year"
            extra="Minimum year of record's occurrences"
          >
            <InputNumber />
          </FormItem>
          <FormItem
            {...formItemLayout}
            name="maxyear"
            label="Max year"
            extra="Maximum year of record's occurrences"
          >
            <InputNumber />
          </FormItem>

          <FormItem {...formItemLayout} name="country" label="Country">
            <Select
              mode="multiple"
              allowClear
              showSearch
              filterOption={(input, option) => {
                return option.children
                  .toLowerCase()
                  .startsWith(input.toLowerCase());
              }}>
              {country.map((i) => (
                <Option key={i.alpha2}>{i.name}</Option>
              ))}
            </Select>
          </FormItem>

          <Form.Item
          {...formItemLayout}
        name="polygon"
        label="Polygon"
        valuePropName="fileList"
        getValueFromEvent={e => {console.log(e)}}
        extra="For spatial filtering. A GeoPackage file (.gpkg)"
      >
        <Upload name="polygon"
        accept=".gpkg"
        onRemove={(file) => {
          const index = polygonFileList.indexOf(file);
          const newFileList = polygonFileList.slice();
          newFileList.splice(index, 1);
          setPolygonFileList(newFileList);
        }} 
        beforeUpload={(file) => {
          setPolygonFileList([...polygonFileList, file]);
          return false;
        }} 
        fileList={polygonFileList}
        >
          <Button icon={<UploadOutlined />} disabled={polygonFileList.length >0}>Click to select .gpkg file</Button>
        </Upload>
      </Form.Item>

          <Tabs centered items={[
            {
              label: 'Draw a rectangle on a map', key: 'item-1', children: <FormItem  {...formItemLayout} name="boundingBox" label="Area">
                <Map />
              </FormItem>
            }, // remember to pass the key prop
            {
              label: 'Select WGSRPD regions', key: 'item-2', children: <FormItem  {...formItemLayout} name="regions" label="World Geographical Scheme for Recording Plant Distributions (WGSRPD)">
                <WGRPD />
              </FormItem>
            },
          ]} />

        </Panel>
        <Panel header="GBIF Occurrence filtering and aggregation" key="4">
          <FormItem {...formItemLayout} name="basisofrecordinclude" label="Include BasisOfRecord">
            <Select
              mode="multiple"
              allowClear
              style={{ width: "400px" }}
            >
              {basisOfRecord.map((i) => (
                <Option key={i}>{i}</Option>
              ))}
            </Select>
          </FormItem>

          <FormItem {...formItemLayout} name="basisofrecordexclude" label="Exclude BasisOfRecord">
            <Select
              mode="multiple"
              allowClear
              style={{ width: "400px" }}
            >
              {basisOfRecord.map((i) => (
                <Option key={i}>{i}</Option>
              ))}
            </Select>
          </FormItem>
          <Form.Item
            {...formItemLayout}
            name="terrestrial"
            label="Use Land polygon for removal of non-terrestrial occurrences"
            extra="This will use the pipeline_data/Land_Buffered_025_dgr.RData file from the PhyloNext pipeline repository"
            valuePropName="checked"
          >
            <Checkbox />

          </Form.Item>
          <Form.Item
            {...formItemLayout}
            name="rmcountrycentroids"
            label="Remove data from polygons with country and province centroids"
            extra="This will use the pipeline_data/CC_CountryCentroids_buf_1000m.RData file from the PhyloNext pipeline repository"
            valuePropName="checked"
          >
            <Checkbox />

          </Form.Item>

          <Form.Item
            {...formItemLayout}
            name="rmcountrycapitals"
            label="Remove data from polygons with with country capitals"
            extra="This will use the pipeline_data/CC_Capitals_buf_10000m.RData file from the PhyloNext pipeline repository"
            valuePropName="checked"
          >
            <Checkbox />

          </Form.Item>

          <Form.Item
            {...formItemLayout}
            name="rminstitutions"
            label="Remove data from polygons with biological institutuions and museums"
            extra="This will use the pipeline_data/CC_Institutions_buf_100m.RData file from the PhyloNext pipeline repository"
            valuePropName="checked"
          >
            <Checkbox />

          </Form.Item>
          <Form.Item
            {...formItemLayout}
            name="rmurban"
            label="Remove data from polygons with urban areas"
            extra="This will use the pipeline_data/CC_Urban.RData file from the PhyloNext pipeline repository"
            valuePropName="checked"
          >
            <Checkbox />

          </Form.Item>



          <Form.Item
            {...formItemLayout}
            name="dbscan"
            label="DBSCAN"
            extra="Logical, remove spatial outliers with density-based clustering"
            valuePropName="checked"
          >
            <Checkbox />
          </Form.Item>
          <FormItem
            {...formItemLayout}
            name="dbscannoccurrences"
            label="Minimum species occurrence to perform DBSCAN"
          >
            <InputNumber />
          </FormItem>
          <FormItem
            {...formItemLayout}
            name="dbscanepsilon"
            label="DBSCAN parameter epsilon, km"
          >
            <InputNumber />
          </FormItem>
          <FormItem
            {...formItemLayout}
            name="dbscanminpts"
            label="DBSCAN min number of points"
          >
            <InputNumber />
          </FormItem>


        </Panel>
        <Panel header="Biodiverse settings" key="5">

        <Button type="link" href="https://phylonext.github.io/biodiverse/#diversity-indices" target="_blank"><InfoCircleOutlined/> About biodiverse indices</Button>

          <FormItem {...formItemLayout} 
          name="profile" 
          label="Profile"
          extra={
          <ul style={{marginLeft: "-23px"}}>
            <li>Phylogenetic runs biodiverse indices: calc_pd,calc_pe,calc_phylo_rpd2,calc_phylo_rpe2</li><li>Non-Phylogenetic Phylogenetic runs biodiverse indices: calc_richness,calc_hurlbert_es</li>
            </ul>
            
          }>
            <Radio.Group defaultValue={'phylogenetic'} >
              <Radio value={'phylogenetic'}>Phylogenetic</Radio>
              <Radio value={'nonPhylogenetic'}>Non-Phylogenetic (Hurlbert's ES index)</Radio>
            </Radio.Group>
          </FormItem>
          <FormItem
            hasFeedback={h3resolution > 3}
            validateStatus={h3resolution > 3 ? "warning" : null}
            help={h3resolution > 3 ? "Be ware that higher values should only be applied for smaller geographical areas" : null}
            {...formItemLayout}
            name="h3resolution"
            label="H3 resolution (Polygon size)"
          /* extra="Pick a higher value for smaller areas" */
          >
            <Select defaultValue={2} style={{ width: 100 }} onChange={setH3resolution}>
              {[1, 2, 3, 4].map(key => <Option key={key}>{key}</Option>)}
            </Select>
            {/* <InputNumber /> */}
          </FormItem>

          <FormItem {...formItemLayout} name="randname" label="Randomisation name">
            <Select >
              {['rand_structured', 'rand_independent_swaps'].map((i) => (
                <Option key={i}>{i}</Option>
              ))}
            </Select>
          </FormItem>
          <FormItem
            {...formItemLayout}
            name="iterations"
            label="Number of randomisation iterations (max 1000)"
          >
            <InputNumber max={1000} />
          </FormItem>
          <Form.Item
          {...formItemLayout}
        name="randconstrain"
        label="Rand Constrain"
        valuePropName="fileList"
        getValueFromEvent={e => {console.log(e)}}
        extra={<><span>For spatially-constrained randomization. A GeoPackage file (.gpkg). Example:</span> <a href="https://github.com/vmikk/PhyloNext/raw/main/pipeline_data/ZoogeographicRegions.gpkg"> ZoogeographicRegions.gpkg</a></>}
      >
        <Upload name="randconstrain"
        accept=".gpkg"
        onRemove={(file) => {
          const index = randconstrainFileList.indexOf(file);
          const newFileList = randconstrainFileList.slice();
          newFileList.splice(index, 1);
          setRandconstrainFileList(newFileList);
        }} 
        beforeUpload={(file) => {
          setRandconstrainFileList([...randconstrainFileList, file]);
          return false;
        }} 
        fileList={randconstrainFileList}
        >
          <Button icon={<UploadOutlined />} disabled={randconstrainFileList.length >0}>Click to select .gpkg file</Button>
        </Upload>
      </Form.Item>

        </Panel>
      </Collapse>

      {/* <FormItem {...formItemLayout} name="indices" label="Indices">
            <Select mode="multiple" allowClear>
              {biodiverseIndices.map((i) => (
                <Option key={i}>{i}</Option>
              ))}
            </Select>
          </FormItem> */}

      <FormItem style={{ marginTop: "10px" }} extra={!user ? 'Please login to start the pipeline' : null}>
        <Button loading={loading} type="primary" disabled={!user} htmlType="submit">
          Start pipeline run
        </Button>
      </FormItem>
    </Form>

  );
};

const mapContextToProps = ({ step, setStep, runID, setRunID, preparedTrees, user, logout }) => ({
  step, setStep, runID, setRunID, preparedTrees, user, logout
});
export default withContext(mapContextToProps)(PhyloNextForm);
