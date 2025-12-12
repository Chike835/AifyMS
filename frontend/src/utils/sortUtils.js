export const sortData = (data, sortField, sortDirection) => {
    if (!sortField || !sortDirection || !data) {
        return data;
    }

    return [...data].sort((a, b) => {
        let valueA = getNestedValue(a, sortField);
        let valueB = getNestedValue(b, sortField);

        // Handle null/undefined - prioritize valid values
        if (valueA === null || valueA === undefined) return 1;
        if (valueB === null || valueB === undefined) return -1;

        // Check for dates
        const dateA = new Date(valueA);
        const dateB = new Date(valueB);

        // Simple heuristic to check if strings are valid dates
        const isDate = (val) => {
            if (typeof val !== 'string') return false;
            // Prevent numbers being treated as dates (except maybe timestamps, but here we assume ISO strings mostly)
            if (!isNaN(val)) return false;
            const d = new Date(val);
            return d instanceof Date && !isNaN(d);
        };

        if (isDate(valueA) && isDate(valueB)) {
            valueA = dateA.getTime();
            valueB = dateB.getTime();
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
            // numbers are fine as is
        }

        if (valueA < valueB) {
            return sortDirection === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
            return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
    });
};

const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};
