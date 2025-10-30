const Info = () => {
    return (
        <div className="info-card">
            <h3 className="info-title">How It Works</h3>
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
                        <strong>Decrypt :</strong> Recipient enters the passphrase to automatically retrieve the file and decrypt it locally.
                    </p>
                </li>
            </ul>

            <div className="security-note">
                <p className="security-text">
                    <strong>Military-Grade Security:</strong> Your passphrase is never stored. The file ID is a one-way hash, making it impossible to reverse-engineer. Even if someone intercepts the encrypted file, they cannot decrypt it without your passphrase.
                </p>
            </div>
        </div>
    )
}

export default Info;