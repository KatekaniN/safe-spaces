import React, { useState, useCallback } from 'react';
import { useSafetyMonitor } from '../hooks/useSafetyMonitor';
import { useNavigate } from 'react-router-dom';

const SafetyListenerPage: React.FC = () => {
    const navigate = useNavigate();
    const [textTrigger, setTextTrigger] = useState('');

    const handleUploadSuccess = useCallback(() => {
        setTimeout(() => navigate('/RecordingPage'), 1500);
    }, [navigate]);

    const {
        isListening,
        isRecording,
        isTriggerRecording,
        statusMessage,
        countdown,
        triggerWords,
        addTrigger,
        deleteTrigger,
        startRecordTrigger,
        stopRecordTrigger,
    } = useSafetyMonitor({
        onUploadSuccess: handleUploadSuccess
    });

    const handleAddTextTrigger = () => {
        if (addTrigger(textTrigger)) {
            setTextTrigger('');
        }
    };

    const buttonStyle: React.CSSProperties = {
        padding: '8px 14px',
        borderRadius: 10,
        border: '1.5px solid #8764C1',
        background: 'transparent',
        color: '#8764C1',
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    };

    return (
        <div style={{ padding: '16px', maxWidth: '800px', margin: '20px auto' }}>
            <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginBottom: '24px' }}>Safety Listener</h3>

                {/* Trigger Input Section */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', marginBottom: '24px' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Secret trigger word</label>
                        <input
                            type="text"
                            value={textTrigger}
                            onChange={(e) => setTextTrigger(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTextTrigger()}
                            placeholder="e.g., 'help me now'"
                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ccc' }}
                        />
                    </div>
                    <button onClick={handleAddTextTrigger} style={{ ...buttonStyle, background: '#8764C1', color: 'white' }}>Save Trigger</button>
                    <button
                        onMouseDown={startRecordTrigger}
                        onMouseUp={stopRecordTrigger}
                        onMouseLeave={stopRecordTrigger}
                        onTouchStart={(e) => { e.preventDefault(); startRecordTrigger(); }}
                        onTouchEnd={(e) => { e.preventDefault(); stopRecordTrigger(); }}
                        style={{ ...buttonStyle, background: isTriggerRecording ? '#DC3545' : '#17A2B8', color: 'white', border: 'none' }}
                    >
                        {isTriggerRecording ? 'Recording...' : 'Hold to Record Trigger'}
                    </button>
                </div>

                {/* Status Section */}
                <div style={{ marginBottom: '24px', background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span>
                            🎤 Listening: <strong style={{ color: isListening ? '#10B981' : '#6B7280' }}>{isListening ? 'Active' : 'Stopped'}</strong>
                        </span>
                        <span>
                            <span style={{ color: isRecording ? '#EF4444' : 'inherit' }}>🔴</span> Recording: <strong>{isRecording ? `Active (${countdown}s)` : 'Idle'}</strong>
                        </span>
                    </div>
                    <div style={{ marginTop: '8px', minHeight: '20px', color: '#6B7280', fontSize: '14px' }}>
                        <em>{statusMessage}</em>
                    </div>
                </div>

                {/* Custom Triggers List */}
                <div>
                    <h5>Custom Triggers</h5>
                    <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                        {triggerWords.length === 0 ? (
                            <p style={{ color: '#6B7280', fontSize: '14px' }}>No custom triggers added yet.</p>
                        ) : (
                            triggerWords.map(word => (
                                <div key={word} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                                    <span>{word}</span>
                                    <button onClick={() => deleteTrigger(word)} style={{ background: '#FECACA', color: '#991B1B', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}>Delete</button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- THIS IS THE FIX ---
// Ensure the "default" keyword is here.
export default SafetyListenerPage;