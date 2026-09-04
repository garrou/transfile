import { useState } from 'react';
import { generateFileId, decryptFileData, decryptTextData } from '../utils/crypto';
import { downloadFile } from '../services/api';
import { TYPE_FILE, TYPE_TEXT } from '../utils/constants';

export const useFileDecryption = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [decryptedFile, setDecryptedFile] = useState(null);

    const downloadAndDecrypt = async (passphrase) => {
        setIsProcessing(true);
        setError(null);

        try {
            const fileId = await generateFileId(passphrase.trim());
            const storedData = await downloadFile(fileId);

            const aadMetadata = { filename: storedData.filename, type: storedData.type, kind: storedData.kind };

            if (storedData.kind === TYPE_TEXT) {
                const text = await decryptTextData(storedData.data, passphrase.trim(), aadMetadata);

                setDecryptedFile({
                    kind: TYPE_TEXT,
                    text,
                    uploadedAt: storedData.uploadedAt,
                });
            } else {
                const decryptedContent = await decryptFileData(storedData.data, passphrase.trim(), aadMetadata);
                const blob = new Blob([decryptedContent], { type: storedData.type });

                setDecryptedFile({
                    kind: TYPE_FILE,
                    blob,
                    filename: storedData.filename,
                    uploadedAt: storedData.uploadedAt,
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setDecryptedFile(null);
        setError(null);
        setIsProcessing(false);
    }

    return {
        downloadAndDecrypt,
        reset,
        isProcessing,
        error,
        decryptedFile,
    };
};
