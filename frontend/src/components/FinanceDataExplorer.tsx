import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
type GraphNode = { id: string; type: string; label: string; attributes?: Record<string, unknown> };
type GraphEdge = { id: string; source: string; target: string; type: string; label?: string };
type GraphResponse = { nodes: GraphNode[]; edges: GraphEdge[]; root: string | null };
type MetaInput = { id: string; label: string; kind: 'text'|'number'|'date'|'select'; options?: string[] };
type MetaQueryOption = { type: string; inputs: MetaInput[] };
type MetaRefType = { type: string; display: string; queryBy: MetaQueryOption[] };
type MetaData = { referenceDataTypes: MetaRefType[] } | null;
type NodePositions = Record<string, { x: number; y: number; level: number; index: number }>;

const FinanceDataExplorer = () => {
  const [metaData, setMetaData] = useState<MetaData>(null);
  const [selectedRefDataType, setSelectedRefDataType] = useState<string>('');
  const [selectedQueryBy, setSelectedQueryBy] = useState<string>('');
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [graphData, setGraphData] = useState<GraphResponse>({ nodes: [], edges: [], root: null });
  const [selectedNode, setSelectedNode] = useState<{ id: string; data: unknown } | null>(null);
  const [loading, setLoading] = useState(false);
  const [leftWidth, setLeftWidth] = useState(350);
  const [topHeight, setTopHeight] = useState(300);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<NodePositions>({});
  
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingVertical = useRef(false);
  const isDraggingHorizontal = useRef(false);
  const isPanning = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Graph configuration - all values from backend or calculated dynamically
  const GRAPH_CONFIG = {
    NODE_WIDTH: 200,
    NODE_HEIGHT: 100,
    ATTR_WIDTH: 140,
    ATTR_HEIGHT: 40,
    LEVEL_SPACING: 300,
    NODE_VERTICAL_SPACING: 150,
    ATTR_OFFSET_Y: -60,
    ATTR_SPACING_X: 50,
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 3,
    ZOOM_STEP: 0.1
  };

  // Fetch metadata on component mount
  useEffect(() => {
    fetchMetaData();
  }, []);

  // Calculate positions when graph data changes
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      calculateNodePositions();
    }
  }, [graphData]);

  const fetchMetaData = async () => {
    try {
      const response = await fetch('/api/meta');
      const data = await response.json();
      setMetaData(data);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const handleRefDataTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedRefDataType(value);
    setSelectedQueryBy('');
    setInputValues({});
  };

  const handleQueryByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedQueryBy(value);
    setInputValues({});
  };

  const handleInputChange = (fieldId: string, value: string) => {
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
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    } catch (error) {
      console.error('Error searching:', error);
      alert('Error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = async (nodeId: string, nodeType: string, businessId: string) => {
    try {
      const response = await fetch(`/api/node/${nodeType}/${businessId}`);
      const data = await response.json();
      setSelectedNode({ id: nodeId, data });
    } catch (error) {
      console.error('Error fetching node data:', error);
    }
  };

  const getNodeAttributes = (node: GraphNode) => {
    const attrs: { key: string; value: string }[] = [];
    if (node.attributes) {
      Object.entries(node.attributes).forEach(([key, value]) => {
        if (value && 
            key !== 'tradingLines' && 
            key !== 'underlyingInstrumentIds' && 
            key !== 'compositionId' && 
            key !== 'constituentStocks' && 
            attrs.length < 3) {
          attrs.push({ key, value: String(value) });
        }
      });
    }
    return attrs;
  };

  const calculateNodePositions = () => {
    const positions: NodePositions = {};
    const levels: Record<string, number> = {};
    const nodesPerLevel: Record<number, string[]> = {};
    
    // Build adjacency map for traversal
    const adjacencyMap: Record<string, string[]> = {};
    graphData.edges.forEach(edge => {
      if (!adjacencyMap[edge.source]) adjacencyMap[edge.source] = [];
      adjacencyMap[edge.source].push(edge.target);
    });

    // BFS to assign levels
    const queue: Array<{ nodeId: string; level: number }> = [];
    const visited: Set<string> = new Set();
    
    if (graphData.root) {
      queue.push({ nodeId: graphData.root, level: 0 });
      levels[graphData.root] = 0;
      visited.add(graphData.root);
    }

    while (queue.length > 0) {
      const { nodeId, level } = queue.shift();
      
      if (!nodesPerLevel[level]) nodesPerLevel[level] = [];
      nodesPerLevel[level].push(nodeId);

      if (adjacencyMap[nodeId]) {
        adjacencyMap[nodeId].forEach(childId => {
          if (!visited.has(childId)) {
            visited.add(childId);
            levels[childId] = level + 1;
            queue.push({ nodeId: childId, level: level + 1 });
          }
        });
      }
    }

    // Handle unconnected nodes
    graphData.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const maxLevel = Math.max(...(Object.values(levels) as number[]), -1) + 1;
        levels[node.id] = maxLevel;
        if (!nodesPerLevel[maxLevel]) nodesPerLevel[maxLevel] = [];
        nodesPerLevel[maxLevel].push(node.id);
      }
    });

    // Dynamic spacing for tidier edges
    const levelKeys = Object.keys(nodesPerLevel).map(n => parseInt(n, 10));
    const maxPerLevel = levelKeys.length ? Math.max(...levelKeys.map(k => (nodesPerLevel[k] || []).length)) : 1;
    const dynamicLevelSpacing = Math.max(260, Math.min(480, 220 + 60 * Math.log2(Math.max(2, maxPerLevel))));
    const dynamicVerticalSpacing = Math.max(140, Math.min(240, 120 + 20 * maxPerLevel));

    // Calculate positions with proper spacing
    Object.entries(nodesPerLevel).forEach(([level, nodeIds]) => {
      const levelNum = parseInt(level);
      const x = 100 + levelNum * dynamicLevelSpacing;
      
      // Center nodes vertically within their level
      const ids = nodeIds as string[];
      const totalHeight = (ids.length - 1) * dynamicVerticalSpacing;
      const startY = 200 - totalHeight / 2;
      
      ids.forEach((nodeId, index) => {
        const y = startY + index * dynamicVerticalSpacing;
        positions[nodeId] = { x, y, level: levelNum, index };
      });
    });

    setNodePositions(positions);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + GRAPH_CONFIG.ZOOM_STEP, GRAPH_CONFIG.MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - GRAPH_CONFIG.ZOOM_STEP, GRAPH_CONFIG.MIN_ZOOM));
  };

  const handleResetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current || (e.target as Element).closest('.graph-background')) {
      isPanning.current = true;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: panOffset.x,
        panY: panOffset.y
      };
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning.current) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      setPanOffset({
        x: dragStartRef.current.panX + deltaX / zoom,
        y: dragStartRef.current.panY + deltaY / zoom
      });
    }
  }, [zoom]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const DraggableNode = ({ node, position, onNodeClick }: { node: GraphNode; position: { x: number; y: number; level: number; index: number }; onNodeClick: (id: string, type: string, businessId: string) => void }) => {
    const [nodePos, setNodePos] = useState(position);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });

    const nodeId = node.id.split(':')[1];
    const attributes = getNodeAttributes(node);

    const handleNodeMouseDown = (e: React.MouseEvent<SVGRectElement>) => {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX,
        y: e.clientY,
        nodeX: nodePos.x,
        nodeY: nodePos.y
      };
      e.stopPropagation();
      e.preventDefault();
    };

    const handleNodeMouseMove = useCallback((e: MouseEvent) => {
      if (isDragging) {
        const deltaX = (e.clientX - dragStartPos.current.x) / zoom;
        const deltaY = (e.clientY - dragStartPos.current.y) / zoom;
        
        const newPos = {
          x: dragStartPos.current.nodeX + deltaX,
          y: dragStartPos.current.nodeY + deltaY
        };
        
        setNodePos(prev => ({ ...prev, ...newPos }));
        setNodePositions(prev => ({
          ...prev,
          [node.id]: { ...prev[node.id], ...newPos }
        }));
      }
    }, [isDragging, zoom, node.id]);

    const handleNodeMouseUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleNodeMouseMove);
        document.addEventListener('mouseup', handleNodeMouseUp);
      }
      return () => {
        document.removeEventListener('mousemove', handleNodeMouseMove);
        document.removeEventListener('mouseup', handleNodeMouseUp);
      };
    }, [isDragging, handleNodeMouseMove, handleNodeMouseUp]);

    useEffect(() => {
      setNodePos(position);
    }, [position]);

    return (
      <g>
        {/* Main Node */}
        <rect
          x={nodePos.x}
          y={nodePos.y}
          width={GRAPH_CONFIG.NODE_WIDTH}
          height={GRAPH_CONFIG.NODE_HEIGHT}
          rx={8}
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth={2}
          className="cursor-pointer hover:stroke-blue-400 transition-colors"
          onMouseDown={handleNodeMouseDown}
          onClick={() => onNodeClick(node.id, node.type, nodeId)}
        />
        
        {/* Node Type and ID */}
        <text
          x={nodePos.x + GRAPH_CONFIG.NODE_WIDTH / 2}
          y={nodePos.y + 25}
          textAnchor="middle"
          className="fill-gray-800 text-sm font-semibold pointer-events-none select-none"
        >
          {node.type}: {nodeId}
        </text>
        
        {/* Divider Line */}
        <line
          x1={nodePos.x + 10}
          y1={nodePos.y + GRAPH_CONFIG.NODE_HEIGHT / 2}
          x2={nodePos.x + GRAPH_CONFIG.NODE_WIDTH - 10}
          y2={nodePos.y + GRAPH_CONFIG.NODE_HEIGHT / 2}
          stroke="#e2e8f0"
          strokeWidth={1}
          className="pointer-events-none"
        />
        
        {/* Node Label/Name */}
        <text
          x={nodePos.x + GRAPH_CONFIG.NODE_WIDTH / 2}
          y={nodePos.y + 75}
          textAnchor="middle"
          className="fill-gray-600 text-sm pointer-events-none select-none"
        >
          {node.label.length > 20 ? node.label.substring(0, 20) + '...' : node.label}
        </text>

        {/* Attributes - positioned above the main node */}
        {attributes.slice(0, 3).map((attr, index) => {
          const attrX = nodePos.x + (GRAPH_CONFIG.NODE_WIDTH - (attributes.length * GRAPH_CONFIG.ATTR_WIDTH + (attributes.length - 1) * GRAPH_CONFIG.ATTR_SPACING_X)) / 2 + 
                       index * (GRAPH_CONFIG.ATTR_WIDTH + GRAPH_CONFIG.ATTR_SPACING_X);
          const attrY = nodePos.y + GRAPH_CONFIG.ATTR_OFFSET_Y;
          const attrCenterX = attrX + GRAPH_CONFIG.ATTR_WIDTH / 2;
          const attrCenterY = attrY + GRAPH_CONFIG.ATTR_HEIGHT / 2;
          
          return (
            <g key={attr.key}>
              {/* Connection line to attribute */}
              <line
                x1={nodePos.x + GRAPH_CONFIG.NODE_WIDTH / 2}
                y1={nodePos.y}
                x2={attrCenterX}
                y2={attrY + GRAPH_CONFIG.ATTR_HEIGHT}
                stroke="#cbd5e0"
                strokeWidth={1}
                className="pointer-events-none"
              />
              
              {/* Attribute ellipse */}
              <ellipse
                cx={attrCenterX}
                cy={attrCenterY}
                rx={GRAPH_CONFIG.ATTR_WIDTH / 2}
                ry={GRAPH_CONFIG.ATTR_HEIGHT / 2}
                fill="#f7fafc"
                stroke="#e2e8f0"
                strokeWidth={1}
                className="cursor-pointer hover:fill-gray-100 transition-colors"
              />
              
              {/* Attribute text */}
              <text
                x={attrCenterX}
                y={attrCenterY - 5}
                textAnchor="middle"
                className="fill-gray-700 text-xs font-medium pointer-events-none select-none"
              >
                {attr.key}
              </text>
              <text
                x={attrCenterX}
                y={attrCenterY + 8}
                textAnchor="middle"
                className="fill-gray-600 text-xs pointer-events-none select-none"
              >
                {attr.value.length > 15 ? attr.value.substring(0, 15) + '...' : attr.value}
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
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <div className="text-lg font-medium">Search for data to display the relationship graph</div>
            <div className="text-sm text-gray-400 mt-2">Use the search form on the left to get started</div>
          </div>
        </div>
      );
    }

    // Calculate graph bounds
    const positions = Object.values(nodePositions) as { x: number; y: number; level: number; index: number }[];
    if (positions.length === 0) return null;

    const minX = Math.min(...positions.map(p => p.x)) - 100;
    const maxX = Math.max(...positions.map(p => p.x)) + GRAPH_CONFIG.NODE_WIDTH + 100;
    const minY = Math.min(...positions.map(p => p.y)) + GRAPH_CONFIG.ATTR_OFFSET_Y - 50;
    const maxY = Math.max(...positions.map(p => p.y)) + GRAPH_CONFIG.NODE_HEIGHT + 100;

    const width = (maxX - minX);
    const height = (maxY - minY);

    return (
      <div className="relative w-full h-full overflow-auto">
        {/* Graph Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom indicator */}
        <div className="absolute bottom-4 right-4 z-10 bg-white px-2 py-1 rounded border text-xs text-gray-600">
          {Math.round(zoom * 100)}%
        </div>

        {/* Scrollable inner canvas sized by content and zoom */}
        <div style={{ width: `${width * zoom}px`, height: `${height * zoom}px` }}>
          <svg
            ref={svgRef}
            width={width * zoom}
            height={height * zoom}
            className="cursor-grab active:cursor-grabbing graph-background"
            viewBox={`${minX} ${minY} ${width} ${height}`}
            onMouseDown={handleMouseDown}
          >
            {/* Background */}
            <rect
              x={minX}
              y={minY}
              width={width}
              height={height}
              fill="#fafafa"
              className="graph-background"
            />

            {/* Grid pattern */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect
              x={minX}
              y={minY}
              width={width}
              height={height}
              fill="url(#grid)"
            />

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="12"
                markerHeight="8"
                refX="11"
                refY="4"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon
                  points="0 0, 12 4, 0 8"
                  fill="#4a5568"
                />
              </marker>
            </defs>

            {/* Panning group */}
            <g transform={`translate(${panOffset.x}, ${panOffset.y})`}>
              {/* Render edges */}
              {graphData.edges.map(edge => {
                const sourcePos = nodePositions[edge.source];
                const targetPos = nodePositions[edge.target];
                if (!sourcePos || !targetPos) return null;

                const startX = sourcePos.x + GRAPH_CONFIG.NODE_WIDTH;
                const startY = sourcePos.y + GRAPH_CONFIG.NODE_HEIGHT / 2;
                const endX = targetPos.x;
                const endY = targetPos.y + GRAPH_CONFIG.NODE_HEIGHT / 2;

                // Calculate control points for smooth curve
                const controlOffset = Math.min(120, Math.max(60, Math.abs(endX - startX) / 3));
                const controlX1 = startX + controlOffset;
                const controlX2 = endX - controlOffset;

                const pathData = `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;

                return (
                  <g key={edge.id}>
                    <path
                      d={pathData}
                      stroke="#4a5568"
                      strokeWidth="2"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      className="pointer-events-none"
                    />
                    {edge.label && (
                      <text
                        x={(startX + endX) / 2}
                        y={(startY + endY) / 2 - 10}
                        textAnchor="middle"
                        className="fill-gray-600 text-sm font-medium pointer-events-none select-none"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Render nodes */}
              {graphData.nodes.map(node => {
                const position = nodePositions[node.id];
                if (!position) return null;
                
                return (
                  <DraggableNode
                    key={node.id}
                    node={node}
                    position={position}
                    onNodeClick={handleNodeClick}
                  />
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    );
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

  // Mouse handlers for panel resizing
  const handleVerticalMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingVertical.current = true;
    e.preventDefault();
  };

  const handleHorizontalMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingHorizontal.current = true;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
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
      <div className="flex-1 bg-white overflow-hidden">
        <div className="h-full">
          {renderGraph()}
        </div>
      </div>
    </div>
  );
};

export default FinanceDataExplorer;