
export const downloadJSON = (data, filename) => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

export const convertToCSV = (data) => {
    if (!Array.isArray(data) || !data.length) return '';

    // Collect all unique keys from all objects to ensure headers cover everything
    const allKeys = new Set();
    data.forEach(obj => Object.keys(obj).forEach(k => allKeys.add(k)));
    const headers = Array.from(allKeys);

    const rows = data.map(obj =>
        headers.map(header => {
            const val = obj[header];
            if (val === null || val === undefined) return '';
            // Handle special characters and object stringification
            const stringVal = typeof val === 'object' ? JSON.stringify(val).replace(/"/g, '""') : String(val).replace(/"/g, '""');
            return `"${stringVal}"`;
        }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
};

export const downloadCSV = (data, filename) => {
    if (!data) return;
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};
