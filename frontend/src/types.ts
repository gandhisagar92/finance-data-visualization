export type GraphNode = { id: string; type: string; label: string; attributes?: Record<string, unknown> };
export type GraphEdge = { id: string; source: string; target: string; type: string; label?: string };
export type GraphResponse = { metaVersion?: number; nodes: GraphNode[]; edges: GraphEdge[]; root: string | null };

export type MetaInput = { id: string; label: string; kind: 'text'|'number'|'date'|'select'; options?: string[] };
export type MetaQueryOption = { type: string; inputs: MetaInput[] };
export type MetaRefType = { type: string; display: string; queryBy: MetaQueryOption[] };
export type GraphConfig = {
	NODE_WIDTH: number;
	NODE_HEIGHT: number;
	ATTR_WIDTH: number;
	ATTR_HEIGHT: number;
	LEVEL_SPACING_MIN: number;
	LEVEL_SPACING_MAX: number;
	VERTICAL_SPACING_MIN: number;
	VERTICAL_SPACING_MAX: number;
	ATTR_OFFSET_Y: number;
	ATTR_SPACING_X: number;
	MIN_ZOOM: number;
	MAX_ZOOM: number;
	ZOOM_STEP: number;
};
export type UiConfig = { LEFT_WIDTH: number; TOP_HEIGHT: number };
export type MetaData = { referenceDataTypes: MetaRefType[]; graphConfig: GraphConfig; uiConfig: UiConfig };

export type NodePositions = Record<string, { x: number; y: number; level: number; index: number }>;
export type AttrPositions = Record<string, { x: number; y: number }>;