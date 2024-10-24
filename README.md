# Placetel Fax Fetcher
## Placetel Fax 2 Local Storage

Der Placetel Fax Fetch nutzt die Placetel Web API um Placetel nach neuen Fax Nachrichten zu durchsuchen.
Entsprechend muss in Placetel unter dem Punkt `Integration` > `Web API` ein API Schlüssel erstellt werden. Der Scope Faxes würde hierbei reichen.

Bitte entsprechend den Inhalt der config.json Datei anpassen (API Key einfügen und ggf. Ablageordner für die Fax Nachrichten ändern)
> Wichtig bei Windows: Pfade müssen mit 2 \ angegeben werden. (z.B. D:\\Daten\\PDF Ablage)

Wenn NodeJS auf dem Server installiert ist, kann das Script direkt mit den Befehlen `npm install` und `node index.js` ausgeführt werden. 
Alternativ kann für Windows ein PKG Build als single executable (.exe) heruntergeladen werden. Dies beinhaltet bereits NodeJS und benötigte Libs. 

> Für die Verwendung der .exe muss die `config.json` Datei im selben Ordner wie die .exe angelegt werden. Ein Beispielinhalt für die config.json findet ihr oben.

 
 ## Autostart
 - Linux: Damit das Programm dauerhaft im Hintergrund läuft kann unter Linux pm2 mit node verwendet werden.
 - Windows: Die .exe Datei kann über [nssm](https://nssm.cc/) als Dienst gestartet werden.
