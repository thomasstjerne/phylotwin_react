import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { AutoComplete, Tag } from "antd";
import config from "../config";
import debounce from 'lodash/debounce';

const unauthorizedAxios = axios.create();

const TaxonAutoComplete = ({ value, onChange, rank, higherTaxonKey }) => {
  const [options, setOptions] = useState([]);
  const [searchText, setSearchText] = useState("");
  const abortControllerRef = useRef(null);
  
  // Reset options when higher taxon changes
  useEffect(() => {
    setOptions([]);
    setSearchText("");
  }, [higherTaxonKey]);

  const searchTaxa = async (text) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      if (text) {
        const higherTaxonKeyParams = Array.isArray(higherTaxonKey) && higherTaxonKey.length > 0
          ? higherTaxonKey.map(key => `&higherTaxonKey=${key}`).join('')
          : higherTaxonKey ? `&higherTaxonKey=${higherTaxonKey}` : '';

        const res = await unauthorizedAxios(
          `${config.taxonSearchUrl}?q=${text}&datasetKey=${config.gbifBackboneKey}&rank=${rank}${higherTaxonKeyParams}&isExtinct=false&status=ACCEPTED`,
          { signal: abortControllerRef.current.signal }
        );
        
        if (res?.data?.results) {
          setOptions(
            res.data.results.map((t) => ({
              key: t.key,
              value: t.key,
              label: (
                <>
                  <div>{t.canonicalName}</div>
                  <div style={{ fontSize: '0.85em', color: '#666' }}>
                    {Object.keys(t.higherClassificationMap)
                      .map((k) => t.higherClassificationMap[k])
                      .join(" > ")}
                  </div>
                </>
              ),
              canonicalName: t.canonicalName
            }))
          );
        }
      } else {
        setOptions([]);
      }
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error('Search error:', error);
        setOptions([]);
      }
    }
  };

  // Create debounced version of search
  const debouncedSearch = useRef(
    debounce(searchTaxa, 50, { leading: true })
  ).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const onSearch = (text) => {
    setSearchText(text);
    debouncedSearch(text);
  };

  const onSelect = (key, option) => {
    const newValues = [...new Set([...value, { key, name: option.canonicalName }])];
    setSearchText("");
    setOptions([]);
    onChange(newValues);
  };

  const removeValue = (keyToRemove) => {
    const newValues = value.filter((v) => v.key !== keyToRemove);
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
        style={{ width: '100%' }}
      ></AutoComplete>
      <div style={{marginTop: "8px"}}>{value.map((v) => (
        <Tag key={v.key} closable onClose={() => removeValue(v.key)} style={{ margin: '0 4px 4px 0' }}>{v.name}</Tag>
      ))}</div>
    </>
  );
};

export default TaxonAutoComplete;
