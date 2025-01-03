import React, { useState, useEffect } from "react";
import axios from "axios";
import { AutoComplete, Tag } from "antd";
import config from "../config";
const unauthorizedAxios = axios.create();

const TaxonAutoComplete = ({ value, onChange, rank, higherTaxonKey }) => {
  const [options, setOptions] = useState([]);
  const [searchText, setSearchText] = useState("")
  useEffect(() => {
  }, [value]);

  const onSearch = async (text) => {
    setSearchText(text)
    try {
      if (text) {
        const res = await unauthorizedAxios(
         // `${config.taxonSuggestUrl}?q=${text}&datasetKey=${config.gbifBackboneKey}&rank=${rank}`
         `${config.taxonSearchUrl}?q=${text}&datasetKey=${config.gbifBackboneKey}&rank=${rank}${higherTaxonKey ? '&higherTaxonKey='+higherTaxonKey : ''}`
        );
        setOptions(
          res?.data?.results?.map((t) => ({
            key: t.key,
            value: t.canonicalName,
            label: (
              <>
                <div>{t.canonicalName}</div>
                <div>
                  {Object.keys(t.higherClassificationMap)
                    .map((k) => t.higherClassificationMap[k])
                    .join(" > ")}
                </div>
              </>
            ),
          }))
        );
      } else {
        setOptions([]);
      }
    } catch (error) {
      alert(error);
    }
  };

  const onSelect = (data) => {
    const newValues = [...new Set([...value, data])];
    setSearchText("")
    onChange(newValues);
    // console.log("onSelect", data);
  };

  const removeValue = (val) => {
    const newValues = value.filter((v) => v !== val);
    // setValues(newValues)
    onChange(newValues);
  };
  return (
    <>
      <AutoComplete
        value={searchText}
        onSelect={onSelect}
        onSearch={onSearch}
        options={options}
        allowClear
      ></AutoComplete>
      <div style={{marginTop: "8px"}}>{value.map((v) => (
        <Tag key={v} closable onClose={() => removeValue(v)}>{v}</Tag>
      ))}</div>
    </>
  );
};

export default TaxonAutoComplete;
