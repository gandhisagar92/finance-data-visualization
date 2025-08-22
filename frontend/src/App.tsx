import { useEffect, useState } from 'react';
import HeaderBar from './components/HeaderBar';
import SearchForm from './components/SearchForm';
import GraphView from './components/GraphView';
import NodeDetails from './components/NodeDetails';
import { MetaData, GraphResponse } from './types';

function App() {
	const [metaData, setMetaData] = useState<MetaData | null>(null);
	const [selectedRefDataType, setSelectedRefDataType] = useState<string>('');
	const [selectedQueryBy, setSelectedQueryBy] = useState<string>('');
	const [inputValues, setInputValues] = useState<Record<string, string>>({});
	const [graphData, setGraphData] = useState<GraphResponse>({ nodes: [], edges: [], root: null });
	const [selectedNode, setSelectedNode] = useState<{ id: string; data: unknown } | null>(null);
	const [loading, setLoading] = useState(false);
	const [leftWidth, setLeftWidth] = useState<number>(350);
	const [topHeight, setTopHeight] = useState<number>(300);
	const [showAttributes, setShowAttributes] = useState<boolean>(true);

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch('/api/meta');
				const data: MetaData = await res.json();
				setMetaData(data);
				setLeftWidth(data.uiConfig.LEFT_WIDTH);
				setTopHeight(data.uiConfig.TOP_HEIGHT);
			} catch (e) {
				console.error('Failed to load meta', e);
			}
		})();
	}, []);

	const onRefDataTypeChange = (value: string) => { setSelectedRefDataType(value); setSelectedQueryBy(''); setInputValues({}); };
	const onQueryByChange = (value: string) => { setSelectedQueryBy(value); setInputValues({}); };
	const onInputChange = (fieldId: string, value: string) => setInputValues(prev => ({ ...prev, [fieldId]: value }));

	const onSearch = async () => {
		if (!selectedRefDataType || !selectedQueryBy || Object.keys(inputValues).length === 0) {
			alert('Please fill all required fields');
			return;
		}
		setLoading(true);
		try {
			const response = await fetch('/api/search', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ referenceDataType: selectedRefDataType, queryByType: selectedQueryBy, inputs: inputValues })
			});
			const data: GraphResponse = await response.json();
			setGraphData(data);
		} catch (error) {
			console.error('Error searching:', error);
			alert('Error occurred during search');
		} finally { setLoading(false); }
	};

	const handleNodeClick = async (nodeId: string, nodeType: string, businessId: string) => {
		try {
			const response = await fetch(`/api/node/${nodeType}/${businessId}`);
			const data = await response.json();
			setSelectedNode({ id: nodeId, data });
		} catch (error) { console.error('Error fetching node data:', error); }
	};

	return (
		<div className="h-screen bg-gray-50 flex flex-col">
			<HeaderBar />
			<div className="flex flex-1 min-h-0">
				{/* Left Panel */}
				<div className="flex flex-col bg-white border-r border-gray-200" style={{ width: leftWidth }}>
					{/* Top Left - User Input */}
					<div className="flex-shrink-0 p-6 border-b border-gray-200" style={{ height: topHeight }}>
						<SearchForm
							metaData={metaData}
							selectedRefDataType={selectedRefDataType}
							selectedQueryBy={selectedQueryBy}
							inputValues={inputValues}
							loading={loading}
							onRefDataTypeChange={onRefDataTypeChange}
							onQueryByChange={onQueryByChange}
							onInputChange={onInputChange}
							onSearch={onSearch}
						/>
					</div>
					{/* Resizer */}
					<div className="h-1 bg-gray-200" />
					{/* Bottom Left - Data Payload */}
					<NodeDetails selectedNode={selectedNode} />
				</div>
				{/* Right Panel - Graph */}
				<div className="flex-1 bg-white overflow-hidden">
					<GraphView
						graphData={graphData}
						graphConfig={metaData?.graphConfig || {
							NODE_WIDTH: 200, NODE_HEIGHT: 100, ATTR_WIDTH: 140, ATTR_HEIGHT: 40,
							LEVEL_SPACING_MIN: 260, LEVEL_SPACING_MAX: 480, VERTICAL_SPACING_MIN: 140, VERTICAL_SPACING_MAX: 240,
							ATTR_OFFSET_Y: -60, ATTR_SPACING_X: 50, MIN_ZOOM: 0.1, MAX_ZOOM: 3, ZOOM_STEP: 0.1
						}}
						showAttributes={showAttributes}
						onToggleAttributes={() => setShowAttributes(s => !s)}
						onNodeClick={handleNodeClick}
					/>
				</div>
			</div>
		</div>
	);
}

export default App;