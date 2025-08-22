import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GraphResponse, GraphNode, GraphEdge, GraphConfig, NodePositions, AttrPositions } from '../types';
import { ZoomIn, ZoomOut, RotateCcw, SlidersHorizontal } from 'lucide-react';

interface GraphViewProps {
	graphData: GraphResponse;
	graphConfig: GraphConfig;
	showAttributes: boolean;
	onToggleAttributes: () => void;
	onNodeClick: (nodeId: string, nodeType: string, businessId: string) => void;
}

const GraphView: React.FC<GraphViewProps> = ({ graphData, graphConfig, showAttributes, onToggleAttributes, onNodeClick }) => {
	const [zoom, setZoom] = useState(1);
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
	const [nodePositions, setNodePositions] = useState<NodePositions>({});
	const [attrPositions, setAttrPositions] = useState<AttrPositions>({});
	const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; lines: string[] } | null>(null);

	const svgRef = useRef<SVGSVGElement | null>(null);
	const isPanning = useRef(false);
	const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
	const draggingNodeId = useRef<string | null>(null);
	const draggingAttrKey = useRef<string | null>(null);
	const rafId = useRef<number | null>(null);
	const pendingNodePosRef = useRef<NodePositions>({});
	const pendingAttrPosRef = useRef<AttrPositions>({});

	const getNodeAttributes = (node: GraphNode) => {
		const attrs: { key: string; value: string }[] = [];
		if (node.attributes) {
			Object.entries(node.attributes).forEach(([key, value]) => {
				if (
					value &&
					key !== 'tradingLines' &&
					key !== 'underlyingInstrumentIds' &&
					key !== 'compositionId' &&
					key !== 'constituentStocks'
				) {
					attrs.push({ key, value: String(value) });
				}
			});
		}
		return attrs;
	};

	const scheduleFrame = useCallback(() => {
		if (rafId.current) return;
		rafId.current = requestAnimationFrame(() => {
			setNodePositions(prev => ({ ...prev, ...pendingNodePosRef.current }));
			setAttrPositions(prev => ({ ...prev, ...pendingAttrPosRef.current }));
			pendingNodePosRef.current = {};
			pendingAttrPosRef.current = {};
			rafId.current = null;
		});
	}, []);

	const calculateNodePositions = useCallback(() => {
		const positions: NodePositions = {};
		const levels: Record<string, number> = {};
		const nodesPerLevel: Record<number, string[]> = {};
		const adjacencyMap: Record<string, string[]> = {};
		graphData.edges.forEach(edge => {
			if (!adjacencyMap[edge.source]) adjacencyMap[edge.source] = [];
			adjacencyMap[edge.source].push(edge.target);
		});
		const queue: Array<{ nodeId: string; level: number }> = [];
		const visited: Set<string> = new Set();
		if (graphData.root) {
			queue.push({ nodeId: graphData.root, level: 0 });
			levels[graphData.root] = 0;
			visited.add(graphData.root);
		}
		while (queue.length > 0) {
			const { nodeId, level } = queue.shift()!;
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
		graphData.nodes.forEach(node => {
			if (!visited.has(node.id)) {
				const maxLevel = Math.max(...(Object.values(levels) as number[]), -1) + 1;
				levels[node.id] = maxLevel;
				if (!nodesPerLevel[maxLevel]) nodesPerLevel[maxLevel] = [];
				nodesPerLevel[maxLevel].push(node.id);
			}
		});
		const levelKeys = Object.keys(nodesPerLevel).map(n => parseInt(n, 10));
		const maxPerLevel = levelKeys.length ? Math.max(...levelKeys.map(k => (nodesPerLevel[k] || []).length)) : 1;
		const dynamicLevelSpacing = Math.max(
			graphConfig.LEVEL_SPACING_MIN,
			Math.min(graphConfig.LEVEL_SPACING_MAX, 220 + 60 * Math.log2(Math.max(2, maxPerLevel)))
		);
		const dynamicVerticalSpacing = Math.max(
			graphConfig.VERTICAL_SPACING_MIN,
			Math.min(graphConfig.VERTICAL_SPACING_MAX, 120 + 20 * maxPerLevel)
		);
		Object.entries(nodesPerLevel).forEach(([level, nodeIds]) => {
			const levelNum = parseInt(level);
			const x = 100 + levelNum * dynamicLevelSpacing;
			const ids = nodeIds as string[];
			const totalHeight = (ids.length - 1) * dynamicVerticalSpacing;
			const startY = 200 - totalHeight / 2;
			ids.forEach((nodeId, index) => {
				const y = startY + index * dynamicVerticalSpacing;
				positions[nodeId] = { x, y, level: levelNum, index };
			});
		});
		setNodePositions(positions);
	}, [graphData, graphConfig]);

	useEffect(() => {
		if (graphData.nodes.length) calculateNodePositions();
	}, [graphData, calculateNodePositions]);

	const handleZoomIn = () => setZoom(z => Math.min(z + graphConfig.ZOOM_STEP, graphConfig.MAX_ZOOM));
	const handleZoomOut = () => setZoom(z => Math.max(z - graphConfig.ZOOM_STEP, graphConfig.MIN_ZOOM));
	const handleResetView = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };

	const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
		if (e.target === svgRef.current || (e.target as Element).closest('.graph-background')) {
			isPanning.current = true;
			dragStartRef.current = { x: e.clientX, y: e.clientY, panX: panOffset.x, panY: panOffset.y };
			e.preventDefault();
		}
	};
	const onDocMouseMove = useCallback((e: MouseEvent) => {
		if (isPanning.current) {
			const deltaX = e.clientX - dragStartRef.current.x;
			const deltaY = e.clientY - dragStartRef.current.y;
			setPanOffset({ x: dragStartRef.current.panX + deltaX / zoom, y: dragStartRef.current.panY + deltaY / zoom });
		}
		if (draggingNodeId.current) {
			const id = draggingNodeId.current;
			const current = nodePositions[id];
			if (current) {
				const deltaX = (e.clientX - dragStartRef.current.x) / zoom;
				const deltaY = (e.clientY - dragStartRef.current.y) / zoom;
				pendingNodePosRef.current[id] = { ...current, x: current.x + deltaX, y: current.y + deltaY };
				scheduleFrame();
			}
		}
		if (draggingAttrKey.current) {
			const key = draggingAttrKey.current;
			const ap = attrPositions[key] || { x: 0, y: 0 };
			const deltaX = (e.clientX - dragStartRef.current.x) / zoom;
			const deltaY = (e.clientY - dragStartRef.current.y) / zoom;
			pendingAttrPosRef.current[key] = { x: ap.x + deltaX, y: ap.y + deltaY };
			scheduleFrame();
		}
	}, [zoom, nodePositions, attrPositions, scheduleFrame]);
	const onDocMouseUp = useCallback(() => {
		isPanning.current = false;
		draggingNodeId.current = null;
		draggingAttrKey.current = null;
	}, []);
	useEffect(() => {
		document.addEventListener('mousemove', onDocMouseMove);
		document.addEventListener('mouseup', onDocMouseUp);
		return () => {
			document.removeEventListener('mousemove', onDocMouseMove);
			document.removeEventListener('mouseup', onDocMouseUp);
		};
	}, [onDocMouseMove, onDocMouseUp]);

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

	const positions = Object.values(nodePositions) as { x: number; y: number; level: number; index: number }[];
	if (!positions.length) return null;
	const minX = Math.min(...positions.map(p => p.x)) - 200;
	const maxX = Math.max(...positions.map(p => p.x)) + graphConfig.NODE_WIDTH + 200;
	const minY = Math.min(...positions.map(p => p.y)) + graphConfig.ATTR_OFFSET_Y - 100;
	const maxY = Math.max(...positions.map(p => p.y)) + graphConfig.NODE_HEIGHT + 200;
	const width = (maxX - minX);
	const height = (maxY - minY);

	return (
		<div className="relative w-full h-full">
			{/* Controls */}
			<div className="absolute top-4 right-4 z-10 flex gap-2">
				<button onClick={onToggleAttributes} className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm" title="Toggle Attributes">
					<SlidersHorizontal className="w-4 h-4" />
				</button>
				<button onClick={handleZoomIn} className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm" title="Zoom In">
					<ZoomIn className="w-4 h-4" />
				</button>
				<button onClick={handleZoomOut} className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm" title="Zoom Out">
					<ZoomOut className="w-4 h-4" />
				</button>
				<button onClick={handleResetView} className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm" title="Reset View">
					<RotateCcw className="w-4 h-4" />
				</button>
			</div>
			<div className="absolute bottom-4 right-4 z-10 bg-white px-2 py-1 rounded border text-xs text-gray-600">{Math.round(zoom * 100)}%</div>

			<svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing graph-background" viewBox={`${minX} ${minY} ${width} ${height}`} onMouseDown={handleMouseDown}>
				<rect x={minX} y={minY} width={width} height={height} fill="#fafafa" className="graph-background"/>
				<defs>
					<pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
						<path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
					</pattern>
				</defs>
				<rect x={minX} y={minY} width={width} height={height} fill="url(#grid)" />
				<defs>
					<marker id="arrowhead" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto" markerUnits="strokeWidth">
						<polygon points="0 0, 12 4, 0 8" fill="#4a5568" />
					</marker>
				</defs>
				<g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
					{/* Edges */}
					{graphData.edges.map(edge => {
						const sourcePos = nodePositions[edge.source];
						const targetPos = nodePositions[edge.target];
						if (!sourcePos || !targetPos) return null;
						const startX = sourcePos.x + graphConfig.NODE_WIDTH;
						const startY = sourcePos.y + graphConfig.NODE_HEIGHT / 2;
						const endX = targetPos.x;
						const endY = targetPos.y + graphConfig.NODE_HEIGHT / 2;
						const controlOffset = Math.min(120, Math.max(60, Math.abs(endX - startX) / 3));
						const controlX1 = startX + controlOffset;
						const controlX2 = endX - controlOffset;
						const pathData = `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;
						return (
							<g key={edge.id}>
								<path d={pathData} stroke="#4a5568" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" className="pointer-events-none" />
								{edge.label && (
									<text x={(startX + endX) / 2} y={(startY + endY) / 2 - 10} textAnchor="middle" className="fill-gray-600 text-sm font-medium pointer-events-none select-none">{edge.label}</text>
								)}
							</g>
						);
					})}

					{/* Nodes */}
					{graphData.nodes.map(node => {
						const pos = nodePositions[node.id];
						if (!pos) return null;
						const businessId = node.id.split(':')[1];
						const attributes = getNodeAttributes(node);
						const handleNodeMouseDown = (e: React.MouseEvent) => {
							draggingNodeId.current = node.id;
							dragStartRef.current = { x: e.clientX, y: e.clientY, panX: 0, panY: 0 };
							e.stopPropagation();
							e.preventDefault();
						};
						const nodeHover = (e: React.MouseEvent) => {
							const { clientX, clientY } = e;
							const lines: string[] = [];
							Object.entries(node.attributes || {}).forEach(([k, v]) => { if (v) lines.push(`${k}: ${String(v)}`); });
							setHoverInfo({ x: clientX + 10, y: clientY + 10, lines: lines.slice(0, 6) });
						};
						const clearHover = () => setHoverInfo(null);
						return (
							<g key={node.id}>
								<rect x={pos.x} y={pos.y} width={graphConfig.NODE_WIDTH} height={graphConfig.NODE_HEIGHT} rx={8} fill="#ffffff" stroke="#e2e8f0" strokeWidth={2} className="cursor-pointer hover:stroke-blue-400 transition-colors"
									onMouseDown={handleNodeMouseDown}
									onClick={() => onNodeClick(node.id, node.type, businessId)}
									onMouseEnter={nodeHover}
									onMouseLeave={clearHover}
								/>
								<text x={pos.x + graphConfig.NODE_WIDTH / 2} y={pos.y + 25} textAnchor="middle" className="fill-gray-800 text-sm font-semibold pointer-events-none select-none">{node.type}: {businessId}</text>
								<line x1={pos.x + 10} y1={pos.y + graphConfig.NODE_HEIGHT / 2} x2={pos.x + graphConfig.NODE_WIDTH - 10} y2={pos.y + graphConfig.NODE_HEIGHT / 2} stroke="#e2e8f0" strokeWidth={1} className="pointer-events-none"/>
								<text x={pos.x + graphConfig.NODE_WIDTH / 2} y={pos.y + 75} textAnchor="middle" className="fill-gray-600 text-sm pointer-events-none select-none">{node.label.length > 20 ? node.label.substring(0, 20) + '...' : node.label}</text>
								{/* Attributes */}
								{showAttributes && attributes.slice(0, 3).map((attr, index) => {
									const key = `${node.id}::${attr.key}`;
									const defaultX = pos.x + (graphConfig.NODE_WIDTH - (attributes.length * graphConfig.ATTR_WIDTH + (attributes.length - 1) * graphConfig.ATTR_SPACING_X)) / 2 + index * (graphConfig.ATTR_WIDTH + graphConfig.ATTR_SPACING_X);
									const defaultY = pos.y + graphConfig.ATTR_OFFSET_Y;
									const ap = attrPositions[key] || { x: 0, y: 0 };
									const attrX = defaultX + ap.x;
									const attrY = defaultY + ap.y;
									const attrCenterX = attrX + graphConfig.ATTR_WIDTH / 2;
									const attrCenterY = attrY + graphConfig.ATTR_HEIGHT / 2;
									const attrDown = (e: React.MouseEvent) => {
										draggingAttrKey.current = key;
										dragStartRef.current = { x: e.clientX, y: e.clientY, panX: 0, panY: 0 };
										e.stopPropagation();
										e.preventDefault();
									};
									return (
										<g key={key}>
											<line x1={pos.x + graphConfig.NODE_WIDTH / 2} y1={pos.y} x2={attrCenterX} y2={attrY + graphConfig.ATTR_HEIGHT} stroke="#cbd5e0" strokeWidth={1} className="pointer-events-none" />
											<ellipse cx={attrCenterX} cy={attrCenterY} rx={graphConfig.ATTR_WIDTH / 2} ry={graphConfig.ATTR_HEIGHT / 2} fill="#f7fafc" stroke="#e2e8f0" strokeWidth={1} className="cursor-move hover:fill-gray-100 transition-colors" onMouseDown={attrDown} />
											<text x={attrCenterX} y={attrCenterY - 5} textAnchor="middle" className="fill-gray-700 text-xs font-medium pointer-events-none select-none">{attr.key}</text>
											<text x={attrCenterX} y={attrCenterY + 8} textAnchor="middle" className="fill-gray-600 text-xs pointer-events-none select-none">{attr.value.length > 15 ? attr.value.substring(0, 15) + '...' : attr.value}</text>
										</g>
									);
								})}
							</g>
						);
					})}
				</g>
			</svg>
			{/* Hover tooltip */}
			{hoverInfo && (
				<div className="absolute z-20 bg-white border border-gray-300 rounded shadow px-2 py-1 text-[10px] text-gray-700" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
					{hoverInfo.lines.map((l, i) => (<div key={i}>{l}</div>))}
				</div>
			)}
		</div>
	);
};

export default GraphView;