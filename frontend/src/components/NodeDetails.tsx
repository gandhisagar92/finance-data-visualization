import React from 'react';

interface NodeDetailsProps {
	selectedNode: { id: string; data: unknown } | null;
}

const NodeDetails: React.FC<NodeDetailsProps> = ({ selectedNode }) => {
	return (
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
	);
};

export default NodeDetails;