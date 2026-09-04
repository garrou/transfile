export const errorHandler = (err, _, res, __) => {
    const status = err.status || 500;

    if (status >= 500) console.error(err);

    const message = status < 500 ? (err.message || "Server Error") : "Server Error";

    res.status(status).json({message});
};