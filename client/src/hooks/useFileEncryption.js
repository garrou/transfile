import { useState } from "react";
import { generatePassphrase, generateFileId, encryptFileData } from "../utils/crypto";
import { uploadFile } from "../services/api";

export const useFileEncryption = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [generatedPassphrase, setGeneratedPassphrase] = useState("");

    const encryptAndUpload = async (file, deleteAfterDownload) => {
        setIsProcessing(true);
        setError(null);

        try {
            const phrase = generatePassphrase();
            const fileId = await generateFileId(phrase);
            const encryptedData = await encryptFileData(file, phrase);

            const metadata = {
                filename: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                deleteAfterDownload,
            };

            await uploadFile(fileId, encryptedData, metadata);

            setGeneratedPassphrase(phrase);
            return { success: true, passphrase: phrase };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setError(null);
        setIsProcessing(false);
        setGeneratedPassphrase("");
    }

    return {
        encryptAndUpload,
        reset,
        isProcessing,
        error,
        generatedPassphrase,
    };
};