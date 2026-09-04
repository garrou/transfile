import { useState } from "react";
import { generatePassphrase, generateFileId, encryptTextData } from "../utils/crypto";
import { uploadFile } from "../services/api";
import { checkNumber } from "../utils/format";
import { TYPE_TEXT } from "../utils/constants";

export const useTextEncryption = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [generatedPassphrase, setGeneratedPassphrase] = useState("");

    const encryptAndUpload = async (text, deleteAfterDownload, expirationHours) => {
        setIsProcessing(true);
        setError(null);

        try {
            const phrase = generatePassphrase();
            const fileId = await generateFileId(phrase);
            const type = "text/plain";
            const encryptedData = await encryptTextData(text, phrase, { filename: "", type, kind: TYPE_TEXT });
            const expiresHour = checkNumber(expirationHours, 1, 24);

            const metadata = {
                kind: TYPE_TEXT,
                type,
                expirationHours: expiresHour,
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
