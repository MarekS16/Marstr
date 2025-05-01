#!/usr/bin/env node

// Získáme potřebné moduly
const addonInterface = require("./addon");
const express = require("express");
const http = require('http');
const axios = require('axios');
const cors = require('cors');

// Port je kriticky důležitý pro cloudové platformy
const port = process.env.PORT || process.env.port || 3000;

// Generuje HTML stránku s dynamicky vloženou URL
function generateHTML(req) {
    // Detekujeme aktuální URL ze samotného požadavku
    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${host}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Webshare Stremio Addon</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 20px; 
                background-color: #f5f5f5;
                color: #333;
            }
            h1 { 
                color: #2c3e50; 
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
            }
            h2 {
                color: #2980b9;
                margin-top: 30px;
            }
            .container {
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .btn { 
                display: inline-block; 
                background: #3498db; 
                color: white; 
                padding: 10px 15px; 
                text-decoration: none; 
                border-radius: 4px; 
                font-weight: bold; 
                margin: 10px 0;
            }
            .btn:hover {
                background: #2980b9;
            }
            code {
                background: #f8f8f8;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 2px 5px;
                font-family: monospace;
            }
            .feature {
                margin: 15px 0;
                padding-left: 20px;
                border-left: 3px solid #3498db;
            }
            .info-box {
                margin-top: 20px; 
                padding: 15px; 
                background-color: #f8f9fa; 
                border-radius: 6px;
                border-left: 4px solid #3498db;
            }
            .warning {
                background-color: #feecdc;
                border-left-color: #ed8936;
            }
            .step {
                counter-increment: step-counter;
                margin-bottom: 20px;
                position: relative;
                padding-left: 40px;
            }
            .step:before {
                content: counter(step-counter);
                position: absolute;
                left: 0;
                top: 0;
                width: 30px;
                height: 30px;
                background: #3498db;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            }
            .image-container {
                margin: 20px 0;
                text-align: center;
            }
            .image-container img {
                max-width: 100%;
                border-radius: 4px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Webshare Stremio Addon s Real-Debrid podporou</h1>
            
            <div class="info-box warning">
                <strong>Důležité upozornění:</strong> Konfigurace addonu se provádí přímo v aplikaci Stremio, ne na této stránce!
            </div>
            
            <p>Tento addon umožňuje streamování filmů a seriálů z Webshare.cz s volitelnou podporou Real-Debrid pro rychlejší stahování.</p>
            
            <h2>Instalace a nastavení</h2>
            
            <div class="step">
                <strong>Nainstalujte addon do Stremio</strong><br>
                Klikněte na tlačítko níže nebo přidejte následující URL do Stremio ručně v sekci Addons > Přidat Addon:
                <br>
                <a href="stremio://addon/${baseUrl}/manifest.json" class="btn">Nainstalovat do Stremio</a>
                <br>
                <code>${baseUrl}/manifest.json</code>
            </div>
            
            <div class="step">
                <strong>Zadání přihlašovacích údajů</strong><br>
                Po instalaci budete vyzváni k zadání následujících údajů:
                <ul>
                    <li><strong>Webshare.cz login:</strong> Váš uživatelský email nebo jméno</li>
                    <li><strong>Webshare.cz password:</strong> Vaše heslo k účtu Webshare</li>
                    <li><strong>Real-Debrid API Key (volitelné):</strong> API klíč z Real-Debrid účtu</li>
                    <li><strong>Použít Real-Debrid:</strong> Vyberte "ano", pokud chcete využívat Real-Debrid pro streamování</li>
                </ul>
            </div>
            
            <div class="step">
                <strong>Získání API klíče Real-Debrid</strong><br>
                Pokud chcete využívat Real-Debrid (doporučeno pro vysokou rychlost a stabilitu):
                <ol>
                    <li>Přihlaste se ke svému účtu na <a href="https://real-debrid.com/" target="_blank">real-debrid.com</a></li>
                    <li>Přejděte do sekce "Můj účet" > "API"</li>
                    <li>V sekci "Osobní token API" zkopírujte API klíč</li>
                    <li>Tento klíč vložte do konfigurace addonu v Stremio</li>
                </ol>
            </div>
            
            <div class="image-container">
                <img src="https://i.imgur.com/82pPuH0.png" alt="Screenshot Stremio konfigurace" width="400">
                <p><em>Příklad konfiguračního dialogu v Stremio</em></p>
            </div>
            
            <h2>Funkce</h2>
            <div class="feature">
                <strong>Podpora Real-Debrid:</strong> Možnost využít Real-Debrid službu pro rychlejší a stabilnější streamování.
            </div>
            
            <div class="feature">
                <strong>Konfigurovatelné nastavení:</strong> Možnost zapnout/vypnout použití Real-Debrid.
            </div>
            
            <div class="feature">
                <strong>Označené streamy:</strong> Streamy používající Real-Debrid jsou označeny ikonou 🚀.
            </div>
            
            <h2>Řešení problémů</h2>
            <p>Pokud se vám nezobrazují žádné streamy nebo addon nefunguje správně:</p>
            <ul>
                <li><strong>Zkontrolujte přihlašovací údaje</strong> - ujistěte se, že máte správně zadané přihlašovací údaje pro Webshare.cz</li>
                <li><strong>Real-Debrid API klíč</strong> - ověřte, že váš API klíč je platný a správně zadaný</li>
                <li><strong>Reinstalujte addon</strong> - někdy pomůže addon odinstalovat a znovu nainstalovat</li>
                <li><strong>Restartujte Stremio</strong> - po změně konfigurace je dobré restartovat aplikaci Stremio</li>
            </ul>
            
            <div class="info-box">
                <p><strong>Server info:</strong></p>
                <ul>
                    <li>Verze: 0.3.0</li>
                    <li>Stav: Online</li>
                    <li>API endpoint: <a href="${baseUrl}/manifest.json">${baseUrl}/manifest.json</a></li>
                    <li>Aktuální čas serveru: ${new Date().toISOString()}</li>
                </ul>
            </div>
        </div>
        
        <script>
            // Detekce zda jsme na mobilní verzi Stremio
            if (window.location.href.includes('stremio-addon-guide')) {
                document.querySelector('.container').innerHTML = '<h1>Webshare Stremio Addon</h1>' +
                    '<p>Tento addon je úspěšně nainstalován! Nyní můžete zavřít tuto stránku a pokračovat do Stremio.</p>';
            }
        </script>
    </body>
    </html>
    `;
}

// Vytvoříme express HTTP server
const app = express();

// Povolení CORS pro všechny požadavky (důležité pro Stremio)
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    exposedHeaders: ['Content-Length', 'Content-Range', 'Content-Type', 'Accept-Ranges', 'Content-Disposition']
}));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Proxy middleware pro streamování videí bez CORS problémů
app.get('/proxy-stream/:url', async (req, res) => {
    try {
        // Dekódujeme URL ze Base64
        const originalUrl = Buffer.from(req.params.url, 'base64').toString();
        console.log(`Proxying stream request to: ${originalUrl.substring(0, 50)}...`);
        
        // Nastavení hlaviček pro streaming
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges, Content-Disposition');
        
        // Zpracování range requestů (důležité pro video streaming)
        let headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        
        if (req.headers.range) {
            headers.range = req.headers.range;
            console.log(`Range request: ${req.headers.range}`);
        }

        // Nejdříve zjistíme info o videu použitím HEAD requestu
        let contentInfo;
        try {
            const headResponse = await axios.head(originalUrl, { headers });
            contentInfo = {
                contentType: headResponse.headers['content-type'] || 'video/mp4',
                contentLength: headResponse.headers['content-length'],
                acceptRanges: headResponse.headers['accept-ranges'] || 'bytes'
            };
        } catch (headError) {
            console.error('Error during HEAD request:', headError.message);
            contentInfo = {
                contentType: 'video/mp4',
                acceptRanges: 'bytes'
            };
        }
        
        // Nastavíme správné hlavičky pro stream
        res.setHeader('Content-Type', contentInfo.contentType);
        res.setHeader('Accept-Ranges', contentInfo.acceptRanges);
        
        if (contentInfo.contentLength) {
            res.setHeader('Content-Length', contentInfo.contentLength);
        }

        // Streamujeme video z původního zdroje
        const response = await axios({
            method: 'get',
            url: originalUrl,
            responseType: 'stream',
            headers: headers,
            maxRedirects: 5,
            timeout: 30000
        });

        // Kopírujeme hlavičky z odpovědi
        Object.keys(response.headers).forEach(key => {
            // Skip některé hlavičky, které by mohly způsobit problémy
            if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                res.setHeader(key, response.headers[key]);
            }
        });

        // Streamujeme data do odpovědi
        response.data.pipe(res);
        
        // Zpracování chyb při streamování
        response.data.on('error', (err) => {
            console.error('Stream error:', err);
            if (!res.headersSent) {
                res.status(500).send('Stream error');
            } else {
                res.end();
            }
        });
        
        // Cleanup po dokončení
        res.on('close', () => {
            response.data.destroy();
        });
        
    } catch (error) {
        console.error('Proxy error:', error.message);
        
        if (!res.headersSent) {
            res.status(500).send({
                error: 'Failed to proxy stream',
                message: error.message
            });
        } else {
            res.end();
        }
    }
});

// Přidáme middleware pro zpracování požadavků na kořenovou URL
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(generateHTML(req));
});

app.get('/index.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(generateHTML(req));
});

app.get('/health', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        status: 'ok',
        version: '0.3.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/healthz', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send({ status: 'ok' });
});

// Stremio addon endpoints
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(addonInterface.manifest);
    console.log('Manifest requested and served');
});

// Zpracování streamů pomocí addonInterface
app.get('/:resource/:type/:id/:extra?.json', (req, res, next) => {
    const { resource, type, id } = req.params;
    let extra = {};
    
    try {
        if (req.params.extra) {
            extra = JSON.parse(decodeURIComponent(req.params.extra));
        }
    } catch (e) {
        console.error('Error parsing extra params:', e);
    }
    
    console.log(`Request for ${resource}/${type}/${id}`);
    
    if (resource === 'stream') {
        // Přidat config z query parametrů, pokud existují
        if (req.query.config) {
            try {
                extra.config = JSON.parse(decodeURIComponent(req.query.config));
            } catch (e) {
                console.error('Error parsing config:', e);
            }
        }
        
        addonInterface.methods[resource]({ type, id, extra })
            .then(result => {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.send(result);
            })
            .catch(err => {
                console.error('Error serving stream:', err);
                res.status(500).send({ error: 'An error occurred', message: err.message });
            });
    } else {
        next();
    }
});

// Fallback pro všechny ostatní požadavky
app.use((req, res) => {
    res.status(404).send({ 
        error: 'Not found',
        message: 'The requested resource was not found' 
    });
});

// Spustíme server
const server = http.createServer(app);
server.listen(port, '0.0.0.0', () => {
    console.log(`Server běží na portu ${port}`);
});

// Zachytávání chyb
process.on('uncaughtException', (err) => {
  console.error('Neošetřená výjimka:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Neošetřené promise rejection:', reason);
});
