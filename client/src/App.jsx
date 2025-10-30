import { useState } from 'react';
import { Upload, Download, Key, Lock, Unlock, Copy, Check, Shield, FileCheck, Sparkles } from 'lucide-react';

const App = () => {
    const [mode, setMode] = useState('send');
    const [file, setFile] = useState(null);
    const [passphrase, setPassphrase] = useState('');
    const [generatedPassphrase, setGeneratedPassphrase] = useState('');
    const [decryptedFile, setDecryptedFile] = useState(null);
    const [status, setStatus] = useState('');
    const [copied, setCopied] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const generatePassphrase = () => {
        const words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel',
            'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa',
            'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray'];
        const selected = [];
        for (let i = 0; i < 5; i++) {
            selected.push(words[Math.floor(Math.random() * words.length)]);
        }
        return selected.join('-');
    };

    // Generate File ID from passphrase using hash
    const generateFileId = async (passphrase) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(passphrase);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return 'file_' + hashHex.substring(0, 32);
    };

    // Convert ArrayBuffer to base64
    const arrayBufferToBase64 = (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    // Convert base64 to ArrayBuffer
    const base64ToArrayBuffer = (base64) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    };

    // Derive encryption key from passphrase
    const deriveKey = async (passphrase, salt) => {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(passphrase),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    };

    // Encrypt file
    const encryptFile = async () => {
        if (!file) {
            setStatus('Please select a file first');
            return;
        }

        try {
            setIsProcessing(true);
            setStatus('Encrypting your file...');

            const phrase = generatePassphrase();
            const fileId = await generateFileId(phrase);
            const arrayBuffer = await file.arrayBuffer();

            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const key = await deriveKey(phrase, salt);

            const encryptedContent = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                arrayBuffer
            );

            const combined = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(encryptedContent), salt.length + iv.length);

            const base64Data = arrayBufferToBase64(combined.buffer);

            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            const res = await fetch('http://localhost:3000/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileId,
                    data: base64Data,
                    filename: file.name,
                    type: file.type,
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                    expiresAt
                })
            });
            if (!res.ok) throw new Error(await res.text());
            setGeneratedPassphrase(phrase);
            setStatus('success');
            setIsProcessing(false);
        } catch (error) {
            setStatus('Encryption failed: ' + error.message);
            setIsProcessing(false);
            console.error(error);
        }
    };

    // Decrypt file
    const decryptFile = async () => {
        if (!passphrase.trim()) {
            setStatus('Please enter the passphrase');
            return;
        }

        try {
            setIsProcessing(true);
            setStatus('Decrypting your file...');

            const fileId = await generateFileId(passphrase.trim());
            const res = await fetch(`http://localhost:3000/files/${fileId}`);

            if (res.status === 404) {
                setStatus("File not found.");
                return;
            }
            if (!res.ok) throw new Error(await res.text());
            const storedData = await res.json();
            const combined = base64ToArrayBuffer(storedData.data);

            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encryptedContent = combined.slice(28);

            const key = await deriveKey(passphrase.trim(), salt);

            const decryptedContent = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encryptedContent
            );

            const blob = new Blob([decryptedContent], { type: storedData.type });
            setDecryptedFile({
                blob: blob,
                filename: storedData.filename,
                uploadedAt: storedData.uploadedAt
            });

            setStatus('success');
            setIsProcessing(false);
        } catch (error) {
            if (error.name === 'OperationError') {
                setStatus('Invalid passphrase. Please try again.');
            } else {
                setStatus('Decryption failed: ' + error.message);
            }
            setIsProcessing(false);
            console.error(error);
        }
    };

    // Download decrypted file
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

    // Copy to clipboard
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const resetSendForm = () => {
        setFile(null);
        setGeneratedPassphrase('');
        setStatus('');
    };

    const resetReceiveForm = () => {
        setPassphrase('');
        setDecryptedFile(null);
        setStatus('');
    };

    return (
        <div className="app-container">
            <div className="max-width">

                <div className="header">
                    <div className="icon-badge">
                        <Shield size={40} color="white" />
                    </div>
                    <h1 className="title">Secure File Transfer</h1>
                    <p className="subtitle">
                        Military-grade encryption for sharing files safely. One passphrase is all you need.
                    </p>
                </div>

                <div className="mode-selector">
                    <button
                        onClick={() => {
                            setMode('send');
                            resetReceiveForm();
                        }}
                        className={`mode-btn ${mode === 'send' ? 'active' : ''}`}
                    >
                        <Upload size={20} />
                        Send
                    </button>
                    <button
                        onClick={() => {
                            setMode('receive');
                            resetSendForm();
                        }}
                        className={`mode-btn ${mode === 'receive' ? 'active' : ''}`}
                    >
                        <Download size={20} />
                        Receive
                    </button>
                </div>

                {mode === 'send' && (
                    <div className="card">
                        <div className="card-header">
                            <div className="card-icon-badge send">
                                <Upload size={24} color="#6366f1" />
                            </div>
                            <h2 className="card-title">Encrypt & Send</h2>
                        </div>

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

                        <button
                            onClick={encryptFile}
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
                                    Encrypt & Generate Passphrase
                                </>
                            )}
                        </button>

                        {generatedPassphrase && status === 'success' && (
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
                                        <strong>⚠️ Important:</strong> Share this passphrase with your recipient through a secure channel (Signal, encrypted email, etc.). They'll need it to decrypt the file.
                                    </p>
                                </div>
                            </div>
                        )}

                        {status && status !== 'success' && !status.includes('Encrypting') && (
                            <div className="alert">{status}</div>
                        )}
                    </div>
                )}

                {mode === 'receive' && (
                    <div className="card">
                        <div className="card-header">
                            <div className="card-icon-badge receive">
                                <Download size={24} color="#9333ea" />
                            </div>
                            <h2 className="card-title">Receive & Decrypt</h2>
                        </div>

                        <div className="form-group">
                            <label className="label">Enter the passphrase</label>
                            <input
                                type="text"
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && passphrase.trim() && !isProcessing) {
                                        decryptFile();
                                    }
                                }}
                                placeholder="alpha-bravo-charlie-delta-echo"
                                className="input mono"
                            />
                        </div>

                        <button
                            onClick={decryptFile}
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
                                    Decrypt File
                                </>
                            )}
                        </button>

                        {decryptedFile && status === 'success' && (
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
                                <button
                                    onClick={downloadFile}
                                    className="btn success"
                                >
                                    <Download size={20} />
                                    Download File
                                </button>
                            </div>
                        )}

                        {status && status !== 'success' && !status.includes('Decrypting') && (
                            <div className="alert">{status}</div>
                        )}
                    </div>
                )}

                <div className="info-card">
                    <h3 className="info-title">🔐 How It Works</h3>
                    <ul className="step-list">
                        <li className="step-item">
                            <div className="step-badge step-1">1</div>
                            <p className="step-text">
                                <strong>Encrypt :</strong> Select a file and click encrypt. A random passphrase is automatically generated.
                            </p>
                        </li>
                        <li className="step-item">
                            <div className="step-badge step-2">2</div>
                            <p className="step-text">
                                <strong>Secure :</strong> File is encrypted with AES-256-GCM. The passphrase becomes a unique file identifier via SHA-256 hash.
                            </p>
                        </li>
                        <li className="step-item">
                            <div className="step-badge step-3">3</div>
                            <p className="step-text">
                                <strong>Share :</strong> Send only the passphrase to your recipient through a secure channel.
                            </p>
                        </li>
                        <li className="step-item">
                            <div className="step-badge step-4">4</div>
                            <p className="step-text">
                                <strong>Decrypt :</strong> Recipient enters the passphrase to automatically locate and decrypt the file.
                            </p>
                        </li>
                    </ul>

                    <div className="security-note">
                        <p className="security-text">
                            <strong>🛡️ Military-Grade Security:</strong> Your passphrase is never stored. The file ID is a one-way hash, making it impossible to reverse-engineer. Even if someone intercepts the encrypted file, they cannot decrypt it without your passphrase.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;