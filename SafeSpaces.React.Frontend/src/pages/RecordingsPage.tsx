import React, { useState, useEffect } from 'react';
// Make sure your api.ts file is created in src/lib/
import { listRecordings } from '../lib/api';

// Define a type for our recording items
interface Recording {
    name: string;
    url: string;
}

const RecordingsPage: React.FC = () => {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRecordings = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await listRecordings();
            setRecordings(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecordings();
    }, []);

    return (
        <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '16px' }}>Saved Recordings</h3>
            {isLoading && <p>Loading...</p>}
            {error && <p style={{ color: 'darkred' }}>Error: {error}</p>}
            {!isLoading && !error && (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {recordings.length === 0 ? (
                        <p style={{ color: '#6B7280' }}>No recordings yet.</p>
                    ) : (
                        recordings.map((rec) => (
                            <div key={rec.name} style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ wordBreak: 'break-all' }}>{rec.name}</span>
                                    <a style={{ marginLeft: '16px', whiteSpace: 'nowrap' }} href={rec.url}>
                                        Download
                                    </a>
                                </div>
                                <audio controls src={rec.url} style={{ width: '100%' }} />
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default RecordingsPage;