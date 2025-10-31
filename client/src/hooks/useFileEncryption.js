import { useState } from "react";
import { generatePassphrase, generateFileId, encryptFileData } from "../utils/crypto";
import { uploadFile } from "../services/api";
import { checkNumber } from "../utils/format";

export const useFileEncryption = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [generatedPassphrase, setGeneratedPassphrase] = useState("");

    const encryptAndUpload = async (file, deleteAfterDownload, expirationHours) => {
        setIsProcessing(true);
        setError(null);

        try {
            const phrase = generatePassphrase();
            const fileId = await generateFileId(phrase);
            const encryptedData = await encryptFileData(file, phrase);
            const expiresHour = checkNumber(expirationHours, 1, 24);

            const metadata = {
                filename: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString(),
                deleteAfterDownload,
            };

            await uploadFile(fileId, encryptedData, metadata);

            setGeneratedPassphrase(phrase);
        } catch (err) {
            setError(err.message);
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