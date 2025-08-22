import React from 'react';

const HeaderBar: React.FC = () => {
	return (
		<div className="w-full bg-white border-b border-gray-200 h-12 flex items-center px-4">
			<div className="text-base font-semibold text-gray-900">Reference Data Explorer</div>
		</div>
	);
};

export default HeaderBar;