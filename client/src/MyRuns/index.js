import React, { useState, useEffect, useMemo, useCallback } from "react";
import { List, Button, Popconfirm, Space, Input, Typography, message, Tag, Alert, Card, Row, Col, Statistic, Spin, Tooltip } from "antd";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import {axiosWithAuth} from "../Auth/userApi";
import { 
  DownloadOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
  EyeOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { useAuth } from '../Auth/AuthContext';
import PageContent from "../Layout/PageContent";
import config from "../config";
import Logo from "../Layout/Logo";
import { useDispatch } from 'react-redux';
import { 
  resetResults,
  resetVisualization,
  resetMapState,
  updateMapCenter,
  updateMapZoom,
  setPipelineStatus
} from '../store/actions';
import phylogeneticTrees from '../shared/vocabularies/phylogeneticTrees.json';
import countryVocabulary from '../Vocabularies/country.json';

const { Text, Title } = Typography;

const MyRuns = () => {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState('');
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user, logout } = useAuth();

    console.log('MyRuns render - user:', user);

    // Create a map of tree IDs to display names
    const treeDisplayNames = useMemo(() => {
        const names = {};
        phylogeneticTrees.groups.forEach(group => {
            group.trees.forEach(tree => {
                names[tree.fileName] = tree.displayName;
                names[tree.id] = tree.displayName;
            });
        });
        return names;
    }, []);

    // Create a map of country codes to full names
    const countryNames = useMemo(() => {
        const names = {};
        countryVocabulary.forEach(country => {
            names[country.A2] = country.Country;
        });
        return names;
    }, []);

    // Generate a descriptive name for the run
    const getRunName = useCallback((item) => {
        // Get taxonomic scope - collect all specified taxonomic filters
        const taxonomicRanks = ['phylum', 'classs', 'order', 'family', 'genus'];
        const taxonomicFilters = {};
        taxonomicRanks.forEach(rank => {
            const values = item.params?.[rank] || item[rank] || [];
            if (values.length) {
                taxonomicFilters[rank] = values;
            }
        });

        // Get the most specific taxonomic filter
        let taxonomicGroup = null;
        if (Object.keys(taxonomicFilters).length > 0) {
            // Get the most specific rank that has filters
            const lowestRank = taxonomicRanks
                .filter(rank => taxonomicFilters[rank])
                .pop();
            
            if (lowestRank) {
                taxonomicGroup = taxonomicFilters[lowestRank].join(' and ');
            }
        }

        // Get tree name and its main group
        const treeId = item.params?.tree || item.tree;
        const treeName = treeDisplayNames[treeId] || treeId;
        
        // Extract the main group name more carefully
        const getMainGroupFromTree = (treeName) => {
            // Handle special cases based on the vocabulary
            if (treeName.includes('Seed plants')) return 'Seed plants';
            if (treeName.includes('Ray-finned fishes')) return 'Ray-finned fishes';
            if (treeName.includes('Mushroom-forming fungi')) return 'Mushroom-forming fungi';
            
            // For other cases, take everything before the first parenthesis or special character
            const mainPart = treeName.split(/[(]/)[0].trim();
            // Ensure we don't cut off important parts of the name
            return mainPart.endsWith('s') ? mainPart : mainPart + 's';
        };
        
        // Get geographic scope with full country names
        const countryCodes = item.params?.country || item.country || [];
        const polygon = item.params?.polygon || item.polygon;
        let locationPart = '';
        if (countryCodes.length) {
            if (countryCodes.length > 2) {
                locationPart = `across ${countryCodes.length} countries`;
            } else {
                const countryNames = countryCodes
                    .map(code => countryVocabulary.find(c => c.A2 === code)?.Country || code)
                    .join(' and ');
                locationPart = `in ${countryNames}`;
            }
        } else if (polygon) {
            locationPart = 'in selected area';
        } else {
            locationPart = 'globally';
        }

        // Get time period if significantly different from default
        const minyear = item.params?.minyear || item.minyear;
        const maxyear = item.params?.maxyear || item.maxyear;
        let timePart = '';
        if (minyear && maxyear && (minyear > 1950 || maxyear < 2024)) {
            if (minyear === maxyear) {
                timePart = ` (${minyear})`;
            } else {
                timePart = ` (${minyear}–${maxyear})`;
            }
        }

        // Construct the name based on available information
        let name;
        if (taxonomicGroup) {
            // If we have a specific taxonomic group
            name = `${taxonomicGroup} ${locationPart}${timePart}`;
        } else {
            // If we're looking at the whole tree
            const mainGroup = getMainGroupFromTree(treeName);
            name = `${mainGroup} ${locationPart}${timePart}`;
        }

        // If the name is too long, create a more concise version
        if (name.length > 100) {
            if (taxonomicGroup) {
                name = `${taxonomicGroup} ${locationPart.includes('countries') ? locationPart : 'analysis'}`;
            } else {
                const mainGroup = getMainGroupFromTree(treeName);
                name = `${mainGroup} ${locationPart.includes('countries') ? locationPart : 'analysis'}`;
            }
        }

        return name;
    }, [treeDisplayNames, countryVocabulary]);

    const getDescription = useCallback(item => {
        const parts = [];

        // Add phylogenetic tree
        const treeId = item.params?.tree || item.tree;
        if (treeId) {
            console.log('Processing tree:', {
                treeId,
                mappedName: treeDisplayNames[treeId],
                allMappings: treeDisplayNames
            });
            const displayName = treeDisplayNames[treeId] || treeId;
            parts.push(
                <Tooltip title={`Tree: ${displayName}`} key="tree">
                    <Tag color="blue" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Tree: {displayName}
                    </Tag>
                </Tooltip>
            );
        }

        // Add spatial resolution
        const resolution = item.params?.resolution || item.resolution;
        if (resolution) {
            parts.push(
                <Tooltip title={`Resolution: H3/${resolution}`} key="resolution">
                    <Tag color="green">Resolution: H3/{resolution}</Tag>
                </Tooltip>
            );
        }

        // Add area selection
        const country = item.params?.country || item.country || [];
        if (country.length) {
            const countryText = `Countries: ${country.join(', ')}`;
            parts.push(
                <Tooltip title={countryText} key="country">
                    <Tag color="orange" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {countryText}
                    </Tag>
                </Tooltip>
            );
        }
        const polygon = item.params?.polygon || item.polygon;
        if (polygon) {
            parts.push(
                <Tooltip title="Custom polygon" key="polygon">
                    <Tag color="orange">Custom polygon</Tag>
                </Tooltip>
            );
        }

        // Add outlier removal setting
        const outlierSensitivity = item.params?.outlierSensitivity || item.outlierSensitivity;
        if (outlierSensitivity) {
            const text = `Outlier removal: ${outlierSensitivity}`;
            parts.push(
                <Tooltip title={text} key="outlier">
                    <Tag color="volcano">{text}</Tag>
                </Tooltip>
            );
        }

        // Add taxonomic filters
        const taxonomicRanks = ['phylum', 'classs', 'order', 'family', 'genus'];
        taxonomicRanks.forEach(rank => {
            const values = item.params?.[rank] || item[rank] || [];
            if (values.length) {
                const label = rank === 'classs' ? 'Class' : rank.charAt(0).toUpperCase() + rank.slice(1);
                const text = `${label}: ${values.join(', ')}`;
                parts.push(
                    <Tooltip title={text} key={rank}>
                        <Tag color="purple" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {text}
                        </Tag>
                    </Tooltip>
                );
            }
        });

        // Add year range
        const minyear = item.params?.minyear || item.minyear;
        const maxyear = item.params?.maxyear || item.maxyear;
        if (minyear && maxyear) {
            const text = `Years: ${minyear}-${maxyear}`;
            parts.push(
                <Tooltip title={text} key="years">
                    <Tag color="cyan">{text}</Tag>
                </Tooltip>
            );
        }

        // Add record filtering mode
        const basisOfRecord = item.params?.basis_of_record || item.basis_of_record;
        if (basisOfRecord) {
            const isSpecimenFocused = basisOfRecord === 'PRESERVED_SPECIMEN,MATERIAL_SAMPLE,MATERIAL_CITATION,MACHINE_OBSERVATION';
            const isObservationEnhanced = basisOfRecord === 'PRESERVED_SPECIMEN,MATERIAL_SAMPLE,MATERIAL_CITATION,MACHINE_OBSERVATION,HUMAN_OBSERVATION';
            
            if (isSpecimenFocused || isObservationEnhanced) {
                const text = isSpecimenFocused ? 'Records: Specimen-focused' : 'Records: Observation-enhanced';
                parts.push(
                    <Tooltip title={text} key="records">
                        <Tag color="blue">{text}</Tag>
                    </Tooltip>
                );
            }
        }

        // Add diversity indices
        const div = item.params?.div || item.div || [];
        if (div.length) {
            const text = `Indices: ${div.join(', ')}`;
            parts.push(
                <Tooltip title={text} key="div">
                    <Tag color="magenta" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {text}
                    </Tag>
                </Tooltip>
            );
        }

        // Add biodiverse indices
        const bd_indices = item.params?.bd_indices || item.bd_indices || [];
        if (bd_indices.length) {
            const text = `Biodiverse: ${bd_indices.join(', ')}`;
            parts.push(
                <Tooltip title={text} key="bd">
                    <Tag color="magenta" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {text}
                    </Tag>
                </Tooltip>
            );

            // Add randomizations only if biodiverse indices were used
            const rnd = item.params?.rnd || item.rnd;
            if (rnd) {
                const text = `Randomizations: ${rnd}`;
                parts.push(
                    <Tooltip title={text} key="rnd">
                        <Tag color="gold">{text}</Tag>
                    </Tooltip>
                );
            }
        }

        return (
            <Space wrap>
                {parts}
            </Space>
        );
    }, [treeDisplayNames]);

    const getRuns = useCallback(async () => {
        if (!user?.userName) {
            console.log('No user, skipping fetch');
            setLoading(false);
            return;
        }
        
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching runs for user:', user.userName);
            const res = await axiosWithAuth.get(`${config.phylonextWebservice}/api/phylonext/runs/myruns`);
            console.log('Fetched runs with tree data:', res.data?.map(run => ({
                runId: run.run,
                tree: run.params?.tree || run.tree,
                params: run.params
            })));
            setRuns(res.data || []);
        } catch (error) {
            console.error('Failed to fetch runs:', error);
            if (error?.response?.status === 401) {
                message.error('Session expired. Please login again.');
                logout();
            } else {
                setError('Failed to fetch runs. Please try again later.');
                message.error('Failed to fetch runs');
            }
        } finally {
            setLoading(false);
        }
    }, [user?.userName, logout]);

    useEffect(() => {
        console.log('useEffect triggered - user:', user?.userName);
        console.log('useEffect triggered - calling getRuns');
        getRuns();
    }, [getRuns]);

    // Add debug log for initial render
    useEffect(() => {
        console.log('MyRuns mounted - initial user:', user?.userName);
    }, []);

    const deleteRun = async jobId => {
        try {
            await axiosWithAuth.delete(`${config.phylonextWebservice}/api/phylonext/runs/job/${jobId}`);
            message.success('Run deleted successfully');
            await getRuns();
        } catch (error) {
            if (error?.response?.status === 401) {
                logout();
            }
            console.error('Failed to delete run:', error);
            message.error('Failed to delete run');
        }
    };

    const downloadResults = async (jobId) => {
        try {
            const response = await axiosWithAuth.get(
                `${config.phylonextWebservice}/api/phylonext/runs/job/${jobId}/archive`,
                { responseType: 'blob' }
            );
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `phylotwin-run-${jobId}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            message.success('Download started');
        } catch (error) {
            console.error('Failed to download results:', error);
            message.error('Failed to download results');
        }
    };

    const filteredRuns = useMemo(() => {
        console.log('Filtering runs with searchText:', searchText);
        if (!runs || !Array.isArray(runs)) {
            console.log('No runs array available');
            return [];
        }
        
        if (!searchText) {
            console.log('No search text, returning all runs:', runs);
            return runs;
        }

        const searchLower = searchText.toLowerCase();
        return runs.filter(run => {
            // Extract values with fallbacks
            const tree = run.params?.tree || run.tree || '';
            const country = Array.isArray(run.params?.country) ? run.params.country : 
                          Array.isArray(run.country) ? run.country : [];
            const date = moment(run?.started || run?.completed || run?.start_date).format('LLL');
            
            // Log the values being checked for debugging
            console.log('Checking run:', {
                id: run.run,
                tree,
                country,
                date,
                searchText: searchLower
            });

            return (
                tree.toLowerCase().includes(searchLower) ||
                country.join(',').toLowerCase().includes(searchLower) ||
                date.toLowerCase().includes(searchLower)
            );
        });
    }, [runs, searchText]);

    // Add debug logging for runs state changes
    useEffect(() => {
        console.log('Runs state updated:', runs);
    }, [runs]);

    console.log('Rendering MyRuns with filteredRuns:', filteredRuns);

    const stats = useMemo(() => {
        if (!runs || !Array.isArray(runs)) return { total: 0, completed: 0, running: 0, failed: 0 };
        
        return runs.reduce((acc, run) => {
            acc.total++;
            if (run.status === 'completed') acc.completed++;
            else if (run.status === 'running') acc.running++;
            else if (run.status === 'error') acc.failed++;
            return acc;
        }, { total: 0, completed: 0, running: 0, failed: 0 });
    }, [runs]);

    const renderLoading = () => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <Space direction="vertical" align="center">
                <Spin size="large" />
                <Text type="secondary">Loading your analysis history...</Text>
            </Space>
        </div>
    );

    const handleStartNewAnalysis = () => {
        // First reset all Redux states
        dispatch(setPipelineStatus('idle'));
        dispatch(resetResults());
        dispatch(resetVisualization());
        dispatch(resetMapState());
        dispatch(updateMapCenter([20, 0]));
        dispatch(updateMapZoom(2));
        
        // Then navigate to /run with replace to clear URL params
        navigate('/run', { replace: true });
        
        // Finally, force a reload to ensure a completely fresh state
        setTimeout(() => {
            window.location.reload();
        }, 0);
    };

    return (
        <PageContent>
            <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '0 16px' }}>
                {loading ? (
                    renderLoading()
                ) : !user ? (
                    <Alert
                        message="Authentication Required"
                        description="Please login to view your analysis history."
                        type="warning"
                        showIcon
                        style={{ marginTop: 24 }}
                    />
                ) : (
                    <>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            marginBottom: 24,
                            marginTop: 24
                        }}>
                            <Space align="center" size={16}>
                                <Logo />
                                <Title level={2} style={{ margin: 0 }}>Analysis History</Title>
                            </Space>
                            <Button type="primary" onClick={handleStartNewAnalysis}>
                                Start New Analysis
                            </Button>
                        </div>

                        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                            <Col xs={12} sm={6}>
                                <Card>
                                    <Statistic 
                                        title="Total Runs"
                                        value={stats.total}
                                        prefix={<HistoryOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Card>
                                    <Statistic 
                                        title="Completed"
                                        value={stats.completed}
                                        valueStyle={{ color: '#52c41a' }}
                                        prefix={<CheckCircleOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Card>
                                    <Statistic 
                                        title="Running"
                                        value={stats.running}
                                        valueStyle={{ color: '#1890ff' }}
                                        prefix={<SyncOutlined spin={stats.running > 0} />}
                                    />
                                </Card>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Card>
                                    <Statistic 
                                        title="Failed"
                                        value={stats.failed}
                                        valueStyle={{ color: '#ff4d4f' }}
                                        prefix={<WarningOutlined />}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        {error && (
                            <Alert
                                message="Error"
                                description={error}
                                type="error"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                        )}
                        
                        <Input
                            size="large"
                            placeholder="Search runs by tree, country, or date..."
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            style={{ marginBottom: 24 }}
                        />

                        {filteredRuns.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Space direction="vertical" align="center" size="large">
                                    <HistoryOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
                                    <Title level={4}>No analysis runs found</Title>
                                    <Text type="secondary">
                                        Start a new analysis to see your runs here
                                    </Text>
                                    <Button type="primary" onClick={handleStartNewAnalysis}>
                                        Start New Analysis
                                    </Button>
                                </Space>
                            </div>
                        ) : (
                            <List
                                loading={loading}
                                bordered
                                dataSource={filteredRuns}
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showQuickJumper: true,
                                    pageSizeOptions: ['10', '20', '50', '100'],
                                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} runs`,
                                    position: 'both'
                                }}
                                renderItem={(item, index) => (
                                    <List.Item 
                                        key={item.run}
                                        style={{ 
                                            background: index % 2 === 0 ? '#fff' : '#fafafa',
                                            padding: '16px 24px',
                                            marginBottom: 8,
                                            borderRadius: 8,
                                            border: '1px solid #f0f0f0',
                                            transition: 'background-color 0.3s'
                                        }}
                                        actions={[
                                            <Button 
                                                key="view"
                                                type="primary"
                                                icon={<EyeOutlined />}
                                                onClick={() => navigate(`/run/${item.run}`)}
                                            >
                                                View Results
                                            </Button>,
                                            <Button 
                                                key="download"
                                                onClick={() => downloadResults(item.run)}
                                                icon={<DownloadOutlined />}
                                            >
                                                Download
                                            </Button>,
                                            <Popconfirm
                                                key="delete"
                                                placement="topLeft"
                                                title="Are you sure you want to delete this run? This cannot be undone."
                                                onConfirm={() => deleteRun(item.run)}
                                                okText="Yes"
                                                cancelText="No"
                                            >
                                                <Button 
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                >
                                                    Delete
                                                </Button>
                                            </Popconfirm>
                                        ]}
                                    >
                                        <List.Item.Meta
                                            title={
                                                <Space>
                                                    <Text strong style={{ fontSize: '16px' }}>
                                                        {getRunName(item)}
                                                    </Text>
                                                    <Text type="secondary">
                                                        {moment(item.completed || item.started).format('LLL')}
                                                        {' '}
                                                        ({moment(item.completed || item.started).fromNow()})
                                                    </Text>
                                                    {item.status && (
                                                        <Tag color={
                                                            item.status === 'completed' ? 'success' : 
                                                            item.status === 'running' ? 'processing' :
                                                            'error'
                                                        }>
                                                            {item.status}
                                                        </Tag>
                                                    )}
                                                </Space>
                                            }
                                            description={
                                                <div style={{ maxWidth: 'calc(100% - 300px)' }}>
                                                    {getDescription(item)}
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </>
                )}
            </div>
        </PageContent>
    );
};

export default MyRuns;
