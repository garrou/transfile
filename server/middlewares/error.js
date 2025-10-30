export const errorHandler = (err, _, res, __) => {
    const status = err.status || 500;
    const message = err.message || "Server Error";

    res.status(status).json({message});
};