import { useState } from "react";
import { generateFileId } from "../utils/crypto";
import { deleteFile } from "../services/api";

export const useFileDeletion = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [error, setError] = useState(null);

    const reset = () => {
        setIsProcessing(false);
        setError(null);
        setIsDeleted(false);
    }

    const deleteWithPassphrase = async (phrase) => {
        setIsProcessing(true);
        setError(null);

        try {
            const fileId = await generateFileId(phrase);
            await deleteFile(fileId);
            setIsDeleted(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    }

    return {
        deleteWithPassphrase,
        reset,
        isDeleted,
        isProcessing,
        error
    }
}