import { useState } from "react";
import { generatePassphrase, generateFileId, encryptFileData } from "../utils/crypto";
import { uploadFile } from "../services/api";
import { checkNumber } from "../utils/format";
import { TYPE_FILE, MAX_FILENAME_LENGTH, MAX_TYPE_LENGTH } from "../utils/constants";

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
            const filename = file.name.slice(0, MAX_FILENAME_LENGTH);
            const type = file.type.slice(0, MAX_TYPE_LENGTH);
            const encryptedData = await encryptFileData(file, phrase, { filename, type, kind: TYPE_FILE });
            const expiresHour = checkNumber(expirationHours, 1, 24);

            const metadata = {
                kind: TYPE_FILE,
                filename,
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
