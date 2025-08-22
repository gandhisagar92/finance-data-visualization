import React from 'react';
import { MetaData } from '../types';
import { Search, ChevronDown } from 'lucide-react';

interface SearchFormProps {
	metaData: MetaData | null;
	selectedRefDataType: string;
	selectedQueryBy: string;
	inputValues: Record<string, string>;
	loading: boolean;
	onRefDataTypeChange: (value: string) => void;
	onQueryByChange: (value: string) => void;
	onInputChange: (fieldId: string, value: string) => void;
	onSearch: () => void;
}

const SearchForm: React.FC<SearchFormProps> = ({
	metaData,
	selectedRefDataType,
	selectedQueryBy,
	inputValues,
	loading,
	onRefDataTypeChange,
	onQueryByChange,
	onInputChange,
	onSearch,
}) => {
	const currentRefDataType = metaData?.referenceDataTypes?.find(type => type.type === selectedRefDataType);
	const queryOptions = currentRefDataType?.queryBy || [];

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
						onChange={(e) => onInputChange(input.id, e.target.value)}
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
						onChange={(e) => onInputChange(input.id, e.target.value)}
					/>
				) : input.kind === 'number' ? (
					<input
						type="number"
						step="0.01"
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						value={inputValues[input.id] || ''}
						onChange={(e) => onInputChange(input.id, e.target.value)}
						placeholder={`Enter ${input.label}`}
					/>
				) : (
					<input
						type="text"
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						value={inputValues[input.id] || ''}
						onChange={(e) => onInputChange(input.id, e.target.value)}
						placeholder={`Enter ${input.label}`}
					/>
				)}
			</div>
		));
	};

	return (
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
							onChange={(e) => onRefDataTypeChange(e.target.value)}
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
								onChange={(e) => onQueryByChange(e.target.value)}
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
					onClick={onSearch}
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
	);
};

export default SearchForm;