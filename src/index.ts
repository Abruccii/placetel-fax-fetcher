import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import cliProgress from 'cli-progress';

// config.json laden
import config from "./config.json" with {type: "json"};

// Stelle sicher, dass der Ordner existiert
fs.ensureDirSync(config.downloadDir);

// Typen für die API-Antwort
interface Fax {
    id: string;
    created_at: string;
    file: string;
}

// Progressbar erstellen
const progressBar = new cliProgress.SingleBar({
    format: 'Wartezeit |{bar}| {percentage}% || {remaining} Sekunden bis zum nächsten Abruf',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
}, cliProgress.Presets.shades_classic);

// Funktion zum Abrufen und Speichern neuer Faxe
async function fetchNewFaxes(): Promise<void> {
    try {
        console.log('\nSuche nach neuen Faxen...');
        let count = 0;

        // Faxe abrufen
        const response = await axios.get<Fax[]>(config.apiUrl, {
            headers: {
                Authorization: `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json',
            },
        });

        const faxes = response.data;

        // Gehe die Faxe durch und lade die PDFs herunter
        for (const fax of faxes) {
            const { id, created_at, file } = fax;

            // Erstelle Dateinamen mit Zeitstempel
            const fileName = `${created_at.replace(/[:.]/g, '-')}_${id}.pdf`;
            const filePath = path.join(config.downloadDir, fileName);

            // Überprüfe, ob PDF bereits geladen wurde
            if (fs.existsSync(filePath))
                continue;

            // PDF Datei herunterladen und speichern
            const pdfResponse = await axios.get(file, { responseType: 'stream' });

            // Stream to file
            const writer = fs.createWriteStream(filePath);
            pdfResponse.data.pipe(writer);

            // Warten bis der Stream fertig ist
            await new Promise<void>((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            count++;
            console.log(`Fax ${id} gespeichert als ${fileName}`);
        }
        if (count == 0)
            console.log("Kein neues Fax gefunden.");
    } catch (error) {
        console.error('Fehler beim Abrufen der Faxe: ', error);
    }
}

// Funktion, um die Progressbar zwischen Abrufen zu starten
function startProgressBar() {
    const totalSeconds = config.intervalInSeconds;
    let remainingSeconds = totalSeconds;

    // Start der Progressbar mit der gesamten Wartezeit
    progressBar.start(totalSeconds, 0, { remaining: remainingSeconds });

    // Update jede Sekunde
    const progressInterval = setInterval(() => {
        remainingSeconds--;
        progressBar.update(totalSeconds - remainingSeconds, { remaining: remainingSeconds });

        // Wenn die Wartezeit vorbei ist, stoppe die Progressbar und den Intervall
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
