import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';

const FinanceDataExplorer = () => {
  const [metaData, setMetaData] = useState(null);
  const [selectedRefDataType, setSelectedRefDataType] = useState('');
  const [selectedQueryBy, setSelectedQueryBy] = useState('');
  const [inputValues, setInputValues] = useState({});
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], root: null });
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leftWidth, setLeftWidth] = useState(350);
  const [topHeight, setTopHeight] = useState(300);
  
  const graphRef = useRef(null);
  const isDraggingVertical = useRef(false);
  const isDraggingHorizontal = useRef(false);

  // Fetch metadata on component mount
  useEffect(() => {
    fetchMetaData();
  }, []);

  const fetchMetaData = async () => {
    try {
      const response = await fetch('/api/meta');
      const data = await response.json();
      setMetaData(data);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const handleRefDataTypeChange = (e) => {
    const value = e.target.value;
    setSelectedRefDataType(value);
    setSelectedQueryBy('');
    setInputValues({});
  };

  const handleQueryByChange = (e) => {
    const value = e.target.value;
    setSelectedQueryBy(value);
    setInputValues({});
  };

  const handleInputChange = (fieldId, value) => {
    setInputValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSearch = async () => {
    if (!selectedRefDataType || !selectedQueryBy || Object.keys(inputValues).length === 0) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referenceDataType: selectedRefDataType,
          queryByType: selectedQueryBy,
          inputs: inputValues
        })
      });
      const data = await response.json();
      setGraphData(data);
    } catch (error) {
      console.error('Error searching:', error);
      alert('Error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = async (nodeId, nodeType, businessId) => {
    try {
      const response = await fetch(`/api/node/${nodeType}/${businessId}`);
      const data = await response.json();
      setSelectedNode({ id: nodeId, data });
    } catch (error) {
      console.error('Error fetching node data:', error);
    }
  };

  const renderInputFields = () => {
    if (!selectedRefDataType || !selectedQueryBy || !metaData) return null;

    const refDataType = metaData.referenceDataTypes.find(type => type.type === selectedRefDataType);
    if (!refDataType) return null;

    const queryOption = refDataType.queryBy.find(option => option.type === selectedQueryBy);
    if (!queryOption) return null;

    return queryOption.inputs.map(input => (
      <div key={input.id} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {input.label}
        </label>
        {input.kind === 'select' ? (
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={inputValues[input.id] || ''}
            onChange={(e) => handleInputChange(input.id, e.target.value)}
          >
            <option value="">Select...</option>
            {input.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : input.kind === 'date' ? (
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={inputValues[input.id] || ''}
            onChange={(e) => handleInputChange(input.id, e.target.value)}
          />
        ) : input.kind === 'number' ? (
          <input
            type="number"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={inputValues[input.id] || ''}
            onChange={(e) => handleInputChange(input.id, e.target.value)}
            placeholder={`Enter ${input.label}`}
          />
        ) : (
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={inputValues[input.id] || ''}
            onChange={(e) => handleInputChange(input.id, e.target.value)}
            placeholder={`Enter ${input.label}`}
          />
        )}
      </div>
    ));
  };

  const GraphNode = ({ node, x, y, onNodeClick, attributes = [] }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x, y });
    const dragStart = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
      e.preventDefault();
    };

    const handleMouseMove = useCallback((e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y
        });
      }
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const nodeId = node.id.split(':')[1];
    
    return (
      <g>
        {/* Main Node */}
        <rect
          x={position.x}
          y={position.y}
          width={180}
          height={80}
          rx={8}
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth={2}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onMouseDown={handleMouseDown}
          onClick={() => onNodeClick(node.id, node.type, nodeId)}
        />
        
        {/* Node Type and ID */}
        <text
          x={position.x + 90}
          y={position.y + 20}
          textAnchor="middle"
          className="fill-gray-800 text-xs font-semibold"
          onClick={() => onNodeClick(node.id, node.type, nodeId)}
        >
          {node.type}: {nodeId}
        </text>
        
        {/* Divider Line */}
        <line
          x1={position.x + 10}
          y1={position.y + 30}
          x2={position.x + 170}
          y2={position.y + 30}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        
        {/* Node Label/Name */}
        <text
          x={position.x + 90}
          y={position.y + 55}
          textAnchor="middle"
          className="fill-gray-600 text-xs"
          onClick={() => onNodeClick(node.id, node.type, nodeId)}
        >
          {node.label.length > 20 ? node.label.substring(0, 20) + '...' : node.label}
        </text>

        {/* Attributes */}
        {attributes.slice(0, 3).map((attr, index) => {
          const attrY = position.y - 40;
          const attrX = position.x + 60 * index + 10;
          
          return (
            <g key={attr.key}>
              {/* Connection line to attribute */}
              <line
                x1={position.x + 90}
                y1={position.y}
                x2={attrX + 40}
                y2={attrY + 15}
                stroke="#cbd5e0"
                strokeWidth={1}
              />
              
              {/* Attribute ellipse */}
              <ellipse
                cx={attrX + 40}
                cy={attrY + 15}
                rx={35}
                ry={12}
                fill="#f7fafc"
                stroke="#e2e8f0"
                strokeWidth={1}
                className="cursor-pointer hover:fill-gray-100"
              />
              
              {/* Attribute text */}
              <text
                x={attrX + 40}
                y={attrY + 18}
                textAnchor="middle"
                className="fill-gray-700 text-xs"
              >
                {attr.value?.length > 8 ? attr.value.substring(0, 8) + '...' : attr.value}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderGraph = () => {
    if (!graphData.nodes.length) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          Search for data to display the relationship graph
        </div>
      );
    }

    // Position nodes in a hierarchical layout
    const nodePositions = {};
    const levels = {};
    
    // Find root node
    const rootNode = graphData.nodes.find(node => node.id === graphData.root);
    if (rootNode) {
      nodePositions[rootNode.id] = { x: 50, y: 200 };
      levels[rootNode.id] = 0;
    }

    // Position other nodes based on relationships
    let currentLevel = 1;
    const positioned = new Set(rootNode ? [rootNode.id] : []);
    
    while (positioned.size < graphData.nodes.length && currentLevel < 10) {
      let nodesAtLevel = 0;
      
      graphData.edges.forEach(edge => {
        if (positioned.has(edge.source) && !positioned.has(edge.target)) {
          const targetNode = graphData.nodes.find(n => n.id === edge.target);
          if (targetNode) {
            nodePositions[edge.target] = {
              x: 50 + currentLevel * 250,
              y: 100 + nodesAtLevel * 150
            };
            levels[edge.target] = currentLevel;
            positioned.add(edge.target);
            nodesAtLevel++;
          }
        }
      });
      
      currentLevel++;
    }

    // Position any remaining unconnected nodes
    graphData.nodes.forEach((node, index) => {
      if (!positioned.has(node.id)) {
        nodePositions[node.id] = {
          x: 50 + (currentLevel * 250),
          y: 100 + (positioned.size - graphData.nodes.length + index) * 150
        };
      }
    });

    const getNodeAttributes = (node) => {
      const attrs = [];
      if (node.attributes) {
        Object.entries(node.attributes).forEach(([key, value]) => {
          if (value && key !== 'tradingLines' && key !== 'underlyingInstrumentIds' && 
              key !== 'compositionId' && key !== 'constituentStocks' && attrs.length < 3) {
            attrs.push({ key, value: String(value) });
          }
        });
      }
      return attrs;
    };

    return (
      <svg 
        ref={graphRef}
        width="100%" 
        height="100%" 
        className="bg-white"
        style={{ minWidth: '1000px', minHeight: '600px' }}
      >
        {/* Render edges */}
        {graphData.edges.map(edge => {
          const sourcePos = nodePositions[edge.source];
          const targetPos = nodePositions[edge.target];
          if (!sourcePos || !targetPos) return null;

          return (
            <g key={edge.id}>
              <line
                x1={sourcePos.x + 180}
                y1={sourcePos.y + 40}
                x2={targetPos.x}
                y2={targetPos.y + 40}
                stroke="#4a5568"
                strokeWidth={2}
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text
                  x={(sourcePos.x + 180 + targetPos.x) / 2}
                  y={(sourcePos.y + targetPos.y) / 2 + 25}
                  textAnchor="middle"
                  className="fill-gray-600 text-xs font-medium"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#4a5568"
            />
          </marker>
        </defs>

        {/* Render nodes */}
        {graphData.nodes.map(node => {
          const position = nodePositions[node.id];
          if (!position) return null;
          
          const nodeId = node.id.split(':')[1];
          const attributes = getNodeAttributes(node);
          
          return (
            <GraphNode
              key={node.id}
              node={node}
              x={position.x}
              y={position.y}
              onNodeClick={handleNodeClick}
              attributes={attributes}
            />
          );
        })}
      </svg>
    );
  };

  // Mouse handlers for resizing
  const handleVerticalMouseDown = (e) => {
    isDraggingVertical.current = true;
    e.preventDefault();
  };

  const handleHorizontalMouseDown = (e) => {
    isDraggingHorizontal.current = true;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingVertical.current) {
        setLeftWidth(Math.max(250, Math.min(600, e.clientX)));
      }
      if (isDraggingHorizontal.current) {
        setTopHeight(Math.max(200, Math.min(500, e.clientY)));
      }
    };

    const handleMouseUp = () => {
      isDraggingVertical.current = false;
      isDraggingHorizontal.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const currentRefDataType = metaData?.referenceDataTypes?.find(type => type.type === selectedRefDataType);
  const queryOptions = currentRefDataType?.queryBy || [];

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Left Panel */}
      <div className="flex flex-col bg-white border-r border-gray-200" style={{ width: leftWidth }}>
        {/* Top Left - User Input */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200" style={{ height: topHeight }}>
          <div className="h-full overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Search Criteria
            </h2>

            <div className="space-y-4">
              {/* Reference Data Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Data Type
                </label>
                <div className="relative">
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    value={selectedRefDataType}
                    onChange={handleRefDataTypeChange}
                  >
                    <option value="">Select Reference Data Type...</option>
                    {metaData?.referenceDataTypes?.map(type => (
                      <option key={type.type} value={type.type}>{type.display}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Query By */}
              {selectedRefDataType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Query By
                  </label>
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      value={selectedQueryBy}
                      onChange={handleQueryByChange}
                    >
                      <option value="">Select Query Type...</option>
                      {queryOptions.map(option => (
                        <option key={option.type} value={option.type}>{option.type}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Dynamic Input Fields */}
              {renderInputFields()}

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={loading || !selectedRefDataType || !selectedQueryBy}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Resizer */}
        <div
          className="h-1 bg-gray-200 hover:bg-gray-300 cursor-row-resize flex-shrink-0"
          onMouseDown={handleHorizontalMouseDown}
        />

        {/* Bottom Left - Data Payload */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Node Details</h2>
          {selectedNode ? (
            <div className="space-y-2">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Node: {selectedNode.id}</h3>
                <pre className="text-xs text-gray-700 overflow-auto max-h-64 whitespace-pre-wrap">
                  {JSON.stringify(selectedNode.data, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a node from the graph to view its details</p>
          )}
        </div>
      </div>

      {/* Vertical Resizer */}
      <div
        className="w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize flex-shrink-0"
        onMouseDown={handleVerticalMouseDown}
      />

      {/* Right Panel - Graph */}
      <div className="flex-1 bg-white overflow-auto">
        <div className="h-full p-4">
          <div className="h-full bg-white rounded-lg border border-gray-200 overflow-auto">
            {renderGraph()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDataExplorer;