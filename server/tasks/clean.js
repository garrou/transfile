import fs from "fs";
import path from "path";

const folderPath = path.join(path.resolve(), "storage");
const now = new Date();

fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error("Error reading folder:", err);
        return;
    }

    files
        .filter((file) => file.endsWith(".json"))
        .forEach((file) => {
            const metaPath = path.join(folderPath, file);

            try {
                const data = JSON.parse(fs.readFileSync(metaPath, "utf8"));
                const expiresAt = new Date(data.expiresAt);

                if (expiresAt < now) {
                    const associatedFile = path.parse(metaPath);
                    const dataPath = path.join(folderPath, `${associatedFile.name}.bin`);

                    fs.unlinkSync(metaPath);
                    fs.unlinkSync(dataPath);
                }
            } catch (err) {
                console.error(`Error processing ${file}:`, err);
            }
        });
});
