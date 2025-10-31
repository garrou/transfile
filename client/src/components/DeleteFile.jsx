import { useState } from 'react';
import { Sparkles, RotateCcw, Trash } from 'lucide-react';
import { useFileDeletion } from '../hooks/useFileDeletion';

const DeleteFile = () => {
    const [passphrase, setPassphrase] = useState("");
    const { deleteWithPassphrase, error, isDeleted, isProcessing, reset } = useFileDeletion();

    const handleDelete = async () => {
        if (!passphrase.trim()) return;
        await deleteWithPassphrase(passphrase);
    };

    const handleReset = () => {
        setPassphrase("");
        reset();
    };

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-icon-badge receive">
                    <Trash size={24} color="#9333ea" />
                </div>
                <h2 className="card-title">Delete File</h2>
            </div>

            {!isDeleted ? <>
                <div className="form-group">
                    <label className="label">Enter the passphrase</label>
                    <input
                        type="text"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && passphrase.trim() && !isProcessing) {
                                handleDelete();
                            }
                        }}
                        placeholder="act-drift-have-lucky-tornado"
                        className="input mono"
                    />
                </div>

                <button
                    onClick={handleDelete}
                    disabled={!passphrase.trim() || isProcessing}
                    className={`btn ${passphrase.trim() && !isProcessing ? 'delete-btn' : ''}`}
                >
                    {isProcessing ? (
                        <>
                            <div className="spinner"></div>
                            Deleting...
                        </>
                    ) : (
                        <>
                            <Trash size={24} />
                            Delete File
                        </>
                    )}
                </button>
            </> : <>
                <div className="success-box">
                    <div className="success-header">
                        <Sparkles size={24} color="#059669" />
                        <h3 className="success-title">File Deleted!</h3>
                    </div>
                </div>

                <button
                    onClick={handleReset}
                    className="btn btn-reset"
                >
                    <RotateCcw size={20} />
                    Delete Another File
                </button>
            </>
            }

            {error && <div className="alert">{error}</div>}
        </div>
    );
};

export default DeleteFile;