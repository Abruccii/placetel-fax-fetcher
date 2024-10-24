// Imports
const https = require('https');
const fs = require('fs-extra');
const path = require('path');
const cliProgress = require('cli-progress');

let config;
try {
    const configPath = path.join(process.cwd(), 'config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Fehler beim Laden der Konfigurationsdatei:', error);
    process.exit(1);
}
const { apiUrl, apiToken, downloadDir, intervalInSeconds } = config;

// Stelle sicher, dass der Ordner existiert
fs.ensureDirSync(downloadDir);

// Progressbar erstellen
const progressBar = new cliProgress.SingleBar({
    format: 'Wartezeit |{bar}| {percentage}% || {remaining} Sekunden bis zum nächsten Abruf',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
}, cliProgress.Presets.shades_classic);

// Hilfsfunktion für HTTPS-Anfragen
function httpsRequest(url, options) {
    return new Promise((resolve, reject) => {
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsedData = JSON.parse(data);
                        resolve({ data: parsedData, response: res });
                    } catch (e) {
                        console.error('JSON Parse Error:', e);
                        console.error('Raw response (first 100 chars):', data.substring(0, 100));
                        reject(new Error('Failed to parse JSON response'));
                    }
                } else {
                    console.error('HTTP Error:', res.statusCode);
                    reject(new Error(`HTTP Error: ${res.statusCode}`));
                }
            });
        }).on('error', (e) => {
            console.error('HTTPS Request Error:', e);
            reject(e);
        });
    });
}

// Funktion zum Abrufen und Speichern neuer Faxe
async function fetchNewFaxes() {
    try {
        console.log('\nSuche nach neuen Faxen...');
        let count = 0;

        // Faxe abrufen
        const { data } = await httpsRequest(apiUrl, {
            headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!Array.isArray(data)) {
            console.error('Unerwartetes Antwortformat. Erwarte ein Array von Faxen.');
            return;
        }

        // Gehe die Faxe durch und speichere die PDFs
        for (const fax of data) {
            if (!fax.id || !fax.created_at || !fax.file) {
                console.error('Fax-Objekt fehlt erforderliche Felder:', fax);
                continue;
            }

            const { id, created_at, file, report } = fax;

            // Speichere die Hauptfax-Datei
            const fileName = `${created_at.replace(/[:.]/g, '-')}_${id}.pdf`;
            const filePath = path.join(downloadDir, fileName);

            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, Buffer.from(file, 'base64'));
                count++;
                console.log(`Fax ${id} gespeichert als ${fileName}`);
            }
        }

        if (count === 0)
            console.log("Kein neues Fax gefunden.");
    } catch (error) {
        console.error('Fehler beim Abrufen der Faxe: ', error);
    }
}

// Funktion, um die Progressbar zwischen Abrufen zu starten
function startProgressBar() {
    const totalSeconds = intervalInSeconds;
    let remainingSeconds = totalSeconds;

    // Start der Progressbar mit der gesamten Wartezeit
    progressBar.start(totalSeconds, 0, { remaining: remainingSeconds });

    // Update jede Sekunde
    const progressInterval = setInterval(() => {
        remainingSeconds--;
        progressBar.update(totalSeconds - remainingSeconds, { remaining: remainingSeconds });

        // Wenn die Wartezeit vorbei ist, stoppe die Progressbar und den Interval
        if (remainingSeconds <= 0) {
            clearInterval(progressInterval);
            progressBar.stop();

            // Abrufen der Faxe nach Ablauf der Wartezeit
            fetchNewFaxes().then(() => {
                // Starte die Progressbar wieder nach dem Abruf
                startProgressBar();
            });
        }
    }, 1000);
}

// Starte den Prozess
startProgressBar();