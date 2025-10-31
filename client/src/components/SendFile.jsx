import { useState } from 'react';
import { Upload, Lock, Key, Copy, Check, FileCheck, Sparkles, RotateCcw, Clock } from 'lucide-react';
import { useFileEncryption } from '../hooks/useFileEncryption';

const SendFile = () => {
    const [file, setFile] = useState(null);
    const [copied, setCopied] = useState(false);
    const [deleteAfterDownload, setDeleteAfterDownload] = useState(true);
    const [expirationHours, setExpirationHours] = useState(24);
    const { encryptAndUpload, isProcessing, error, generatedPassphrase, reset } = useFileEncryption();

    const handleEncrypt = async () => {
        if (!file) return;
        await encryptAndUpload(file, deleteAfterDownload, expirationHours);
    };

    const handleReset = () => {
        setFile(null);
        setCopied(false);
        setDeleteAfterDownload(true);
        setExpirationHours(24);
        reset();
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-icon-badge send">
                    <Upload size={24} color="#6366f1" />
                </div>
                <h2 className="card-title">Encrypt & Send</h2>
            </div>

            {!generatedPassphrase ?
                <>
                    <div className="form-group">
                        <label className="label">Choose your file</label>
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="file-input"
                        />
                        {file && (
                            <div className="file-info">
                                <FileCheck size={20} color="#6366f1" />
                                <div className="file-info-text">
                                    <div className="file-name">{file.name}</div>
                                    <div className="file-size">{(file.size / 1024).toFixed(2)} KB</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="toggle-container">
                        <label className="toggle-label">
                            <input
                                type="checkbox"
                                checked={deleteAfterDownload}
                                onChange={(e) => setDeleteAfterDownload(e.target.checked)}
                                className="toggle-checkbox"
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-text">
                                Delete file after recipient downloads it
                            </span>
                        </label>
                        <p className="toggle-description">
                            {deleteAfterDownload
                                ? '🔒 File will be automatically deleted after first download (recommended)'
                                : `⚠️ File will remain available for ${expirationHours} hour${expirationHours > 1 ? 's': ''}`}

                            {!deleteAfterDownload && <div className="slider-container">
                                <input
                                    type="range"
                                    min="1"
                                    max="24"
                                    step="1"
                                    value={expirationHours}
                                    onChange={(e) => setExpirationHours(Number(e.target.value))}
                                    className="slider"
                                />
                            </div>}
                        </p>
                    </div>

                    <button
                        onClick={handleEncrypt}
                        disabled={!file || isProcessing}
                        className={`btn ${file && !isProcessing ? 'primary' : ''}`}
                    >
                        {isProcessing ? (
                            <>
                                <div className="spinner"></div>
                                Encrypting...
                            </>
                        ) : (
                            <>
                                <Lock size={24} />
                                Encrypt & Send file
                            </>
                        )}
                    </button>
                </> : <>
                    <div className="success-box">
                        <div className="success-header">
                            <Sparkles size={24} color="#059669" />
                            <h3 className="success-title">File Encrypted Successfully!</h3>
                        </div>

                        <label className="label">
                            <Key size={20} color="#6366f1" style={{ display: 'inline', marginRight: '0.5rem' }} />
                            Your Secure Passphrase
                        </label>
                        <div className="input-group">
                            <input
                                type="text"
                                value={generatedPassphrase}
                                readOnly
                                className="passphrase-input"
                            />
                            <button
                                onClick={() => copyToClipboard(generatedPassphrase)}
                                className="copy-button"
                            >
                                {copied ? (
                                    <>
                                        <Check size={20} />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={20} />
                                        Copy
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="warning-box">
                            <p className="warning-text">
                                <strong>⚠️ Important :</strong> Share this passphrase with your recipient through a secure channel.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleReset}
                        className="btn btn-reset"
                    >
                        <RotateCcw size={20} />
                        Send Another File
                    </button>
                </>
            }

            {error && <div className="alert">{error}</div>}
        </div>
    );
};

export default SendFile;