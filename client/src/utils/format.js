export const checkNumber = (num, min, max) => {
    if (typeof num !== "number") return max;
    if (num < min) return min;
    if (num > max) return max;
    return num;
}