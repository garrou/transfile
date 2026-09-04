export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 200;

export const ID_REGEX = /^[a-f0-9]{32}$/;

export const MIN_EXPIRATION_HOURS = 1;
export const MAX_EXPIRATION_HOURS = 24;

export const MAX_FILENAME_LENGTH = 255;
export const MAX_TYPE_LENGTH = 255;

export const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
export const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 100;
