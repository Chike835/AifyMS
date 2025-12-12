import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const SortIndicator = ({ field, sortField, sortDirection }) => {
    if (sortField !== field) {
        return <ChevronsUpDown className="ml-1 h-3 w-3 text-gray-400 opacity-50" />;
    }

    if (sortDirection === 'asc') {
        return <ChevronUp className="ml-1 h-4 w-4 text-primary-600" />;
    } else if (sortDirection === 'desc') {
        return <ChevronDown className="ml-1 h-4 w-4 text-primary-600" />;
    }

    return null;
};

export default SortIndicator;
