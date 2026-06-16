import { useState } from 'react';
import { MessageSquareText, Lock, Key, Copy, Check, Sparkles, RotateCcw } from 'lucide-react';
import { useTextEncryption } from '../hooks/useTextEncryption';
import { TEXT_MAX_LENGTH, TYPE_TEXT } from '../utils/constants';

const SendText = () => {
    const [text, setText] = useState("");
    const [copied, setCopied] = useState(false);
    const [deleteAfterDownload, setDeleteAfterDownload] = useState(true);
    const [expirationHours, setExpirationHours] = useState(24);
    const { encryptAndUpload, isProcessing, error, generatedPassphrase, reset } = useTextEncryption();

    const handleEncrypt = async () => {
        if (!text.trim()) return;
        await encryptAndUpload(text, deleteAfterDownload, expirationHours);
    };

    const handleReset = () => {
        setText("");
        setCopied(false);
        setDeleteAfterDownload(true);
        setExpirationHours(24);
        reset();
    };

    const copyToClipboard = (value) => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-icon-badge send">
                    <MessageSquareText size={24} color="#6366f1" />
                </div>
                <h2 className="card-title">Encrypt & Send Text</h2>
            </div>

            {!generatedPassphrase ?
                <>
                    <div className="form-group">
                        <label className="label">Your message</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX_LENGTH))}
                            placeholder="Type or paste the message you want to send securely..."
                            className="textarea"
                            rows={6}
                        />
                        <div className="char-count">
                            {text.length} / {TEXT_MAX_LENGTH} characters
                        </div>
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
                                Delete message after recipient reads it
                            </span>
                        </label>
                        <div className="toggle-description">
                            {deleteAfterDownload ? (
                                <p>🔒 Message will be automatically deleted after first retrieval (recommended)</p>
                            ) : (
                                <p>
                                    ⚠️ Message will remain available for{" "}
                                    <span class="toggle-text">
                                        {expirationHours} hour{expirationHours > 1 ? "s" : ""}
                                    </span>
                                </p>
                            )}

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
                        </div>
                    </div>

                    <button
                        onClick={handleEncrypt}
                        disabled={!text.trim() || isProcessing}
                        className={`btn ${text.trim() && !isProcessing ? 'primary' : ''}`}
                    >
                        {isProcessing ? (
                            <>
                                <div className="spinner"></div>
                                Encrypting...
                            </>
                        ) : (
                            <>
                                <Lock size={24} />
                                Encrypt & Send Text
                            </>
                        )}
                    </button>
                </> : <>
                    <div className="success-box">
                        <div className="success-header">
                            <Sparkles size={24} color="#059669" />
                            <h3 className="success-title">Message Encrypted Successfully!</h3>
                        </div>
                        
                        <div className="input-group">
                            <input
                                type={TYPE_TEXT}
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
                        Send Another Message
                    </button>
                </>
            }

            {error && <div className="alert">{error}</div>}
        </div>
    );
};

export default SendText;
