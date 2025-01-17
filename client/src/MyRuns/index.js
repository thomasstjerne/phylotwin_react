import React, { useState, useEffect, useMemo, useCallback } from "react";
import { List, Button, Popconfirm, Space, Input, Typography, message, Tag, Alert } from "antd";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import axiosWithAuth from "../utils/axiosWithAuth";
import { DownloadOutlined, DeleteOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons";
import { useAuth } from '../Auth/AuthContext';
import PageContent from "../Layout/PageContent";
import config from "../config";

const { Text } = Typography;

const MyRuns = () => {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState('');
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    console.log('MyRuns render - user:', user);

    const getDescription = useCallback(item => {
        const parts = [];

        // Add phylogenetic tree
        const tree = item.params?.tree || item.tree;
        if (tree) {
            parts.push(<Tag color="blue" key="tree">Tree: {tree}</Tag>);
        }

        // Add spatial resolution
        const resolution = item.params?.resolution || item.resolution;
        if (resolution) {
            parts.push(<Tag color="green" key="resolution">Resolution: H3/{resolution}</Tag>);
        }

        // Add area selection
        const country = item.params?.country || item.country || [];
        if (country.length) {
            parts.push(<Tag color="orange" key="country">Countries: {country.join(', ')}</Tag>);
        }
        const polygon = item.params?.polygon || item.polygon;
        if (polygon) {
            parts.push(<Tag color="orange" key="polygon">Custom polygon</Tag>);
        }

        // Add taxonomic filters
        const taxonomicRanks = ['phylum', 'classs', 'order', 'family', 'genus'];
        taxonomicRanks.forEach(rank => {
            const values = item.params?.[rank] || item[rank] || [];
            if (values.length) {
                parts.push(
                    <Tag color="purple" key={rank}>
                        {rank === 'classs' ? 'Class' : rank.charAt(0).toUpperCase() + rank.slice(1)}: 
                        {values.join(', ')}
                    </Tag>
                );
            }
        });

        // Add year range
        const minyear = item.params?.minyear || item.minyear;
        const maxyear = item.params?.maxyear || item.maxyear;
        if (minyear && maxyear) {
            parts.push(<Tag color="cyan" key="years">Years: {minyear}-{maxyear}</Tag>);
        }

        // Add diversity indices
        const div = item.params?.div || item.div || [];
        if (div.length) {
            parts.push(
                <Tag color="magenta" key="div">
                    Indices: {div.join(', ')}
                </Tag>
            );
        }
        const bd_indices = item.params?.bd_indices || item.bd_indices || [];
        if (bd_indices.length) {
            parts.push(
                <Tag color="magenta" key="bd">
                    Biodiverse: {bd_indices.join(', ')}
                </Tag>
            );
        }

        // Add randomizations
        const rnd = item.params?.rnd || item.rnd;
        if (rnd) {
            parts.push(<Tag color="gold" key="rnd">Randomizations: {rnd}</Tag>);
        }

        return (
            <Space wrap>
                {parts}
            </Space>
        );
    }, []);

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
            console.log('Fetched runs:', res.data);
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

    return (
        <PageContent>
            <div style={{ width: '100%' }}>
                {loading ? (
                    <div>Loading...</div>
                ) : !user ? (
                    <Alert
                        message="Authentication Required"
                        description="Please login to view your analysis history."
                        type="warning"
                        showIcon
                    />
                ) : (
                    <>
                        <h1>Analysis History ({filteredRuns.length} runs)</h1>
                        
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
                            placeholder="Search runs by tree, country, or date..."
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            style={{ marginBottom: 16 }}
                        />

                        {filteredRuns.length === 0 ? (
                            <Alert
                                message="No Runs Found"
                                description="No analysis runs match your search criteria."
                                type="info"
                                showIcon
                            />
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
                                renderItem={(item) => (
                                    <List.Item 
                                        key={item.run}
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
                                                <Button type="link" danger icon={<DeleteOutlined />}>
                                                    Delete
                                                </Button>
                                            </Popconfirm>
                                        ]}
                                    >
                                        <List.Item.Meta
                                            title={
                                                <Space>
                                                    <Text strong>
                                                        {item.params?.tree || item.tree || 'Unnamed Run'} - {moment(item.completed || item.started).format('LLL')}
                                                    </Text>
                                                    <Text type="secondary">
                                                        ({moment(item.completed || item.started).fromNow()})
                                                    </Text>
                                                    {item.status && (
                                                        <Tag color={item.status === 'completed' ? 'success' : 'processing'}>
                                                            {item.status}
                                                        </Tag>
                                                    )}
                                                </Space>
                                            }
                                            description={getDescription(item)}
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
