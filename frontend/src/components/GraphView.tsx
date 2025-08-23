import React, { useEffect, useMemo, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape, { Core, ElementDefinition, LayoutOptions } from 'cytoscape';
// @ts-ignore
import dagre from 'cytoscape-dagre';
// @ts-ignore
import cyPopper from 'cytoscape-popper';
import tippy, { Instance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { GraphResponse, GraphNode, GraphConfig, StyleConfig } from '../types';
import { SlidersHorizontal, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

cytoscape.use(dagre);
// @ts-ignore
cytoscape.use(cyPopper as any);

interface GraphViewProps {
	graphData: GraphResponse;
	graphConfig: GraphConfig;
	showAttributes: boolean;
	onToggleAttributes: () => void;
	onNodeClick: (nodeId: string, nodeType: string, businessId: string) => void;
	styleConfig: StyleConfig;
}

const GraphView: React.FC<GraphViewProps> = ({ graphData, graphConfig, showAttributes, onToggleAttributes, onNodeClick, styleConfig }) => {
	const cyRef = useRef<Core | null>(null);
	const [, setZoom] = useState<number>(1);
	const tippyMap = useRef<Map<string, Instance>>(new Map());

	const elements = useMemo<ElementDefinition[]>(() => {
		const nodes: ElementDefinition[] = [];
		const edges: ElementDefinition[] = [];
		const toId = (id: string) => id; // already unique
		const getAttrs = (n: GraphNode) => {
			const attrs: { key: string; value: string }[] = [];
			Object.entries(n.attributes || {}).forEach(([k, v]) => {
				if (v && k !== 'tradingLines' && k !== 'underlyingInstrumentIds' && k !== 'compositionId' && k !== 'constituentStocks') {
					attrs.push({ key: k, value: String(v) });
				}
			});
			return attrs;
		};
		for (const n of graphData.nodes) {
			const businessId = n.id.split(':')[1];
			nodes.push({ data: { id: toId(n.id), label: `${n.type}: ${businessId}`, kind: n.type, baseLabel: n.label, raw: n } });
			if (showAttributes) {
				const attrs = getAttrs(n).slice(0, 3);
				attrs.forEach((a, idx) => {
					const attrId = `${n.id}::${a.key}`;
					nodes.push({ data: { id: attrId, label: `${a.key}: ${a.value}`, kind: 'attribute', parent: undefined, rawAttr: a, owner: n.id } });
					edges.push({ data: { id: `${n.id}->attr-${idx}`, source: toId(n.id), target: attrId, type: 'HAS_ATTR' } });
				});
			}
		}
		for (const e of graphData.edges) {
			edges.push({ data: { id: e.id, source: toId(e.source), target: toId(e.target), type: e.type, label: e.label } });
		}
		return [...nodes, ...edges];
	}, [graphData, showAttributes]);

	const layout: LayoutOptions = useMemo(() => ({
		name: 'dagre',
		nodeDimensionsIncludeLabels: true,
		rankDir: 'LR',
		rankSep: Math.max(graphConfig.LEVEL_SPACING_MIN, Math.min(graphConfig.LEVEL_SPACING_MAX, 320)),
		edgeSep: 24,
		nodeSep: Math.max(graphConfig.VERTICAL_SPACING_MIN, Math.min(graphConfig.VERTICAL_SPACING_MAX, 180)),
		spacingFactor: 1,
		fit: true,
		animate: true,
		animationDuration: 300,
	}), [graphConfig]);

	const stylesheet = useMemo(() => ([
		{
			selector: 'node',
			style: {
				'background-color': '#fff',
				'border-color': '#e2e8f0',
				'border-width': 2,
				'label': 'data(label)',
				'font-size': `${styleConfig.nodeTitleFontPx}px`,
				'color': '#1f2937',
				'text-wrap': 'wrap',
				'text-max-width': `${graphConfig.NODE_WIDTH}px`,
				'width': graphConfig.NODE_WIDTH,
				'height': graphConfig.NODE_HEIGHT,
				'shape': 'round-rectangle',
				'padding': 8,
			}
		},
		{
			selector: 'node[kind = "attribute"]',
			style: {
				'background-color': '#f7fafc',
				'border-color': '#e2e8f0',
				'border-width': 1,
				'label': 'data(label)',
				'font-size': `${styleConfig.attrKeyFontPx}px`,
				'color': '#374151',
				'text-wrap': 'wrap',
				'text-max-width': `${graphConfig.ATTR_WIDTH}px`,
				'width': graphConfig.ATTR_WIDTH,
				'height': graphConfig.ATTR_HEIGHT,
				'shape': 'ellipse',
				'padding': 4,
			}
		},
		{
			selector: 'edge',
			style: {
				'curve-style': 'bezier',
				'control-point-step-size': 60,
				'width': 2,
				'target-arrow-shape': 'triangle',
				'target-arrow-color': '#4a5568',
				'line-color': '#4a5568',
				'label': 'data(label)',
				'font-size': `${styleConfig.edgeLabelFontPx}px`,
				'color': '#4b5563',
			}
		},
		{ selector: ':selected', style: { 'border-color': '#3b82f6', 'line-color': '#3b82f6', 'target-arrow-color': '#3b82f6' } },
	]), [graphConfig, styleConfig]);

	useEffect(() => {
		if (!cyRef.current) return;
		const cy = cyRef.current;
		// Smooth drag is default; ensure box selection off and autoungrabify false
		cy.boxSelectionEnabled(false);
		cy.autoungrabify(false);
		cy.on('tap', 'node', (evt) => {
			const n = evt.target;
			const id: string = n.data('id');
			const kind: string = n.data('kind');
			if (kind === 'attribute') return;
			const businessId = id.split(':')[1];
			onNodeClick(id, kind, businessId);
		});
		// Tooltips
		cy.on('mouseover', 'node', evt => {
			const n = evt.target;
			const id: string = n.data('id');
			if (tippyMap.current.has(id)) return;
			const raw: any = n.data('raw');
			const lines: string[] = [];
			Object.entries((raw?.attributes) || {}).forEach(([k, v]) => { if (v) lines.push(`${k}: ${String(v)}`); });
			const ref = n.popperRef();
			const tip = tippy(document.createElement('div'), {
				getReferenceClientRect: ref.getBoundingClientRect,
				content: lines.slice(0, 6).join('<br/>') || 'No attributes',
				allowHTML: true,
				arrow: true,
				placement: 'top',
				interactive: false,
				appendTo: document.body,
				theme: 'light-border',
				moveTransition: 'transform 0.15s ease-out',
			});
			tip.show();
			tippyMap.current.set(id, tip);
		});
		cy.on('mouseout', 'node', evt => {
			const id: string = evt.target.data('id');
			const tip = tippyMap.current.get(id);
			if (tip) { tip.destroy(); tippyMap.current.delete(id); }
		});
		return () => {
			cy.removeAllListeners();
			tippyMap.current.forEach(t => t.destroy());
			tippyMap.current.clear();
		};
	}, [onNodeClick]);

	const applyLayout = () => { if (cyRef.current) cyRef.current.layout(layout).run(); };

	useEffect(() => { applyLayout(); }, [elements, layout]);

	return (
		<div className="relative w-full h-full">
			<div className="absolute top-4 right-4 z-10 flex gap-2">
				<button onClick={onToggleAttributes} className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm" title="Toggle Attributes">
					<SlidersHorizontal className="w-4 h-4" />
				</button>
				<button onClick={() => { if (cyRef.current) { cyRef.current.zoom(cyRef.current.zoom() + graphConfig.ZOOM_STEP); setZoom(cyRef.current.zoom()); } }} className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm" title="Zoom In">
					<ZoomIn className="w-4 h-4" />
				</button>
				<button onClick={() => { if (cyRef.current) { cyRef.current.zoom(cyRef.current.zoom() - graphConfig.ZOOM_STEP); setZoom(cyRef.current.zoom()); } }} className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm" title="Zoom Out">
					<ZoomOut className="w-4 h-4" />
				</button>
				<button onClick={() => { if (cyRef.current) { cyRef.current.center(); applyLayout(); } }} className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm" title="Reset View">
					<RotateCcw className="w-4 h-4" />
				</button>
			</div>
			<div className="absolute bottom-4 right-4 z-10 bg-white px-2 py-1 rounded border text-xs text-gray-600">{Math.round((cyRef.current?.zoom() || 1) * 100)}%</div>
			<CytoscapeComponent
				elements={elements}
				layout={layout}
				stylesheet={stylesheet}
				style={{ width: '100%', height: '100%' }}
				cy={(cy: Core) => { cyRef.current = cy; }}
			/>
		</div>
	);
};

export default GraphView;