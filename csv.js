const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Readable } = require('stream');
const csv = require('csv-parser');
const iconv = require('iconv-lite');

async function parseCsvBySections(filePath) {
    // ⬇️ READ FILE IN BINARY MODE, THEN DECODE TO LATIN1
    const fileStream = fs.createReadStream(filePath).pipe(iconv.decodeStream('latin1'));
    const rl = readline.createInterface({ input: fileStream });

    const sections = [];
    let currentSection = null;
    let buffer = [];

    for await (const line of rl) {
        const trimmed = line.trim();

        if (trimmed === '') continue;

        if (trimmed.startsWith('"Ums')) {
            if (currentSection) {
                currentSection.raw = [...buffer];
                sections.push(currentSection);
            }
            currentSection = {
                title: trimmed.replace(/"/g, ''),
                raw: [],
            };
            buffer = [];
        } else {
            buffer.push(trimmed);
        }
    }

    if (currentSection) {
        currentSection.raw = [...buffer];
        sections.push(currentSection);
    }

    for (const section of sections) {
        const dataLines = [];
        let foundHeader = false;
        for (const line of section.raw) {
            if (!foundHeader && (line.startsWith('"Buchungstag"') || line.startsWith('"Gesch'))) {
                foundHeader = true;
            }
            if (foundHeader) dataLines.push(line);
        }

        const parsed = await parseCsvChunk(dataLines.join('\n'));
        section.entries = parsed;
    }

    return sections;
}

function parseCsvChunk(data) {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = new Readable();
        stream._read = () => {};
        stream.push(data);
        stream.push(null);

        stream
            .pipe(csv({ separator: ';' }))
            .on('data', (row) => results.push(row))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

module.exports = { parseCsvBySections };

