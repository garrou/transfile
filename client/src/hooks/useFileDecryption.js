import { useState } from 'react';
import { generateFileId, decryptFileData } from '../utils/crypto';
import { downloadFile } from '../services/api';

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
            const decryptedContent = await decryptFileData(storedData.data, passphrase.trim());
            const blob = new Blob([decryptedContent], { type: storedData.type });

            const fileData = {
                blob,
                filename: storedData.filename,
                uploadedAt: storedData.uploadedAt
            };

            setDecryptedFile(fileData);
            return { success: true, file: fileData };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
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