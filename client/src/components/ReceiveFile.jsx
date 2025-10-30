import { useState } from 'react';
import { Download, Unlock, Sparkles, RotateCcw } from 'lucide-react';
import { useFileDecryption } from '../hooks/useFileDecryption';

const ReceiveFile = () => {
    const [passphrase, setPassphrase] = useState("");
    const { downloadAndDecrypt, isProcessing, error, decryptedFile, reset } = useFileDecryption();

    const handleDecrypt = async () => {
        if (!passphrase.trim()) return;
        await downloadAndDecrypt(passphrase);
    };

    const handleReset = () => {
        setPassphrase("");
        reset();
    };

    const downloadFile = () => {
        if (!decryptedFile) return;

        const url = URL.createObjectURL(decryptedFile.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = decryptedFile.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-icon-badge receive">
                    <Download size={24} color="#9333ea" />
                </div>
                <h2 className="card-title">Receive & Decrypt</h2>
            </div>

            {!decryptedFile ? <>
                <div className="form-group">
                    <label className="label">Enter the passphrase</label>
                    <input
                        type="text"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && passphrase.trim() && !isProcessing) {
                                handleDecrypt();
                            }
                        }}
                        placeholder="act-drift-have-lucky-tornado"
                        className="input mono"
                    />
                </div>

                <button
                    onClick={handleDecrypt}
                    disabled={!passphrase.trim() || isProcessing}
                    className={`btn ${passphrase.trim() && !isProcessing ? 'receive-btn' : ''}`}
                >
                    {isProcessing ? (
                        <>
                            <div className="spinner"></div>
                            Decrypting...
                        </>
                    ) : (
                        <>
                            <Unlock size={24} />
                            Receive & Decrypt File
                        </>
                    )}
                </button>
            </> : <>
                <div className="success-box">
                    <div className="success-header">
                        <Sparkles size={24} color="#059669" />
                        <h3 className="success-title">File Decrypted Successfully!</h3>
                    </div>
                    <div className="decrypted-info">
                        <p>
                            <strong>Filename:</strong> {decryptedFile.filename}
                        </p>
                        <p className="timestamp">
                            Uploaded: {new Date(decryptedFile.uploadedAt).toLocaleString()}
                        </p>
                    </div>
                    <button onClick={downloadFile} className="btn success">
                        <Download size={20} />
                        Download File
                    </button>
                </div>

                <button
                    onClick={handleReset}
                    className="btn btn-reset"
                >
                    <RotateCcw size={20} />
                    Receive Another File
                </button>
            </>
            }

            {error && <div className="alert">{error}</div>}
        </div>
    );
};

export default ReceiveFile;