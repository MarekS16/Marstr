const axios = require('axios');

// Přidání funkce pro opakované pokusy requestů
async function retryRequest(fn, maxRetries = 3, delay = 1000) {
    let attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            
            if (attempt >= maxRetries) {
                throw error;
            }
            
            console.log(`Pokus ${attempt} selhal, opakuji za ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Exponenciální backoff
            delay *= 2;
        }
    }
}

/**
 * Ověření, zda je API klíč Real-Debrid platný
 */
async function validateApiKey(apiKey) {
    if (!apiKey) return false;
    
    try {
        const response = await retryRequest(async () => {
            return await axios.get('https://api.real-debrid.com/rest/1.0/user', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 10000
            });
        });
        
        return response.status === 200;
    } catch (error) {
        console.error('Chyba při validaci Real-Debrid API klíče:', error.message);
        return false;
    }
}

/**
 * Získá přímý odkaz na stream z Real-Debrid
 */
async function getDirectLink(fileUrl, apiKey) {
    if (!fileUrl || !apiKey) {
        console.error('Chybí URL souboru nebo API klíč');
        return null;
    }
    
    try {
        console.log(`Získávám přímý odkaz z Real-Debrid pro URL: ${fileUrl.substring(0, 50)}...`);
        
        // 1. Nejprve odešleme URL ke zpracování
        const unrestricted = await retryRequest(async () => {
            console.log('Odesílám požadavek na unrestrict link...');
            const response = await axios.post('https://api.real-debrid.com/rest/1.0/unrestrict/link', 
                `link=${encodeURIComponent(fileUrl)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 15000
                }
            );
            return response.data;
        });
        
        if (!unrestricted || !unrestricted.download) {
            console.error('Real-Debrid nevrátil odkaz ke stažení:', unrestricted);
            return null;
        }
        
        // 2. Získáme info o souboru
        const downloadUrl = unrestricted.download;
        let contentType = unrestricted.mimeType || 'video/mp4';
        
        console.log(`Real-Debrid vrátil odkaz: ${downloadUrl.substring(0, 50)}...`);
        console.log(`Typ obsahu: ${contentType}`);
        
        // 3. Použijeme proxy URL pro vyřešení CORS problémů
        const proxyUrl = `/proxy-stream/${Buffer.from(downloadUrl).toString('base64')}`;
        
        return {
            url: proxyUrl,
            contentType: contentType,
            fileSize: unrestricted.filesize || 0,
            filename: unrestricted.filename || 'video'
        };
    } catch (error) {
        console.error('Chyba při získávání odkazu z Real-Debrid:', error.message);
        return null;
    }
}

module.exports = {
    validateApiKey,
    getDirectLink
};