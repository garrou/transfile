const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');
const cors = require("cors");

const STORAGE_DIR = path.join(__dirname, 'storage');
const DB_FILE = path.join(STORAGE_DIR, 'index.json');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors({
    origins: ["*"],
    allowedHeaders: ["Authorization", "Content-Type"],
    exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"]
}));

async function ensureStorage() {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    try {
        await fs.access(DB_FILE);
    } catch (e) {
        await fs.writeFile(DB_FILE, JSON.stringify({}), 'utf8');
    }
}

app.post('/files', async (req, res) => {
    try {
        const { fileId, data, filename, type, size, uploadedAt } = req.body;
        if (!fileId || !data) return res.status(400).send('Missing fields');

        await ensureStorage();
        const dbJson = JSON.parse(await fs.readFile(DB_FILE, 'utf8'));
        dbJson[fileId] = { data, filename, type, size, uploadedAt };
        await fs.writeFile(DB_FILE, JSON.stringify(dbJson), 'utf8');

        res.status(200).send('OK');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.get('/files/:fileId', async (req, res) => {
    try {
        const id = req.params.fileId;
        await ensureStorage();
        const dbJson = JSON.parse(await fs.readFile(DB_FILE, 'utf8'));
        const entry = dbJson[id];
        if (!entry) return res.status(404).send('Not found');
        res.json(entry);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening ${port}`));
