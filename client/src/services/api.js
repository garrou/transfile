const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const deleteFile = async (fileId) => {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
    }
};

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
        const data = await response.json();
        throw new Error(data.message);
    }
};

export const downloadFile = async (fileId) => {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message);
    }
    return data;
};