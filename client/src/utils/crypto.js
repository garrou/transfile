import { words } from "./bip39";

export const generatePassphrase = (length = 12) => {
    const selected = [];
    const randomBytes = new Uint32Array(length);
    crypto.getRandomValues(randomBytes);

    for (let i = 0; i < length; i++) {
        const index = randomBytes[i] % words.length;
        selected.push(words[index]);
    }
    return selected.join('-');
};

export const encryptFileData = async (file, passphrase) => {
    const arrayBuffer = await file.arrayBuffer();
    
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);

    const encryptedContent = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        arrayBuffer
    );

    const combined = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedContent), salt.length + iv.length);

    return arrayBufferToBase64(combined.buffer);
};

export const decryptFileData = async (base64Data, passphrase) => {
    const combined = base64ToArrayBuffer(base64Data);

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedContent = combined.slice(28);

    const key = await deriveKey(passphrase, salt);

    const decryptedContent = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encryptedContent
    );

    return decryptedContent;
};

export const generateFileId = async (passphrase) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(passphrase);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 32);
};

const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const base64ToArrayBuffer = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

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
