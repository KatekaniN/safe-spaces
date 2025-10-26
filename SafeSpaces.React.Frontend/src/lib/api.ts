// src/lib/api.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not defined in .env file");
}

export const listRecordings = async () => {
    const response = await fetch(`${API_BASE_URL}/api/recordings/list`);
    if (!response.ok) {
        throw new Error(`Failed to fetch recordings: ${response.statusText}`);
    }
    return response.json();
};

export const uploadRecording = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const response = await fetch(`${API_BASE_URL}/api/recordings/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Failed to upload recording: ${response.statusText}`);
    }
    return response.json();
};

// You can get the download URL directly from the listRecordings response,
// as the backend provides the full URL.