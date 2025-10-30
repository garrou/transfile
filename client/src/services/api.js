const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const uploadFile = async (fileId, data, metadata) => {
    const response = await fetch(`${API_BASE_URL}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fileId,
            data,
            ...metadata
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response;
};

export const downloadFile = async (fileId) => {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`);

    if (response.status === 404) {
        throw new Error('File not found');
    }

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
};