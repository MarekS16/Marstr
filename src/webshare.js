const needle = require('needle')
const md5 = require('nano-md5');
const sha1 = require('sha1');
const formencode = require('form-urlencoded')
const { filesize } = require('filesize')

const headers = { 
    content_type: 'application/x-www-form-urlencoded; charset=UTF-8', 
    accept: 'text/xml; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

const getQueries = (info) => {
    const names = Array.from(new Set([info.name, info.originalName].filter(n => n)))
    if (info.type == 'series') {
        return names.flatMap(name => {
            const series = info.series.padStart(2, '0')
            const episode = info.episode.padStart(2, '0')
            return [
                `${name} S${series}E${episode}`,
                `${name} ${series}x${episode}`
            ]
        })
    } else {
        return names
    }
}

const search = async (query, token) => {
    console.log('Searching', query)
    const data = formencode({ what: query, category: 'video', limit: 100, wst: token })
    const resp = await needle('post', 'https://webshare.cz/api/search/', data, { headers })
    const files = resp.body.children.filter(el => el.name == 'file')
    const queryWords = query.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").split(' ')

    return files.map(el => {
        const ident = el.children.find(el => el.name == 'ident').value
        const size = el.children.find(el => el.name == 'size').value
        const posVotes = el.children.find(el => el.name == 'positive_votes').value
        const negVotes = el.children.find(el => el.name == 'negative_votes').value
        const name = el.children.find(el => el.name == 'name').value
        const protected = el.children.find(el => el.name == 'password')
        return {
            ident,
            name,
            size,
            posVotes,
            negVotes,
            protected: protected && protected.value == '1'
        }
    })
        // exclude protected files
        .filter(item => !item.protected)
        // compute match factor, that will be used to sort results later
        .map(item => {
            const simpleName = item.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
            const matching = queryWords.filter(word => simpleName.includes(word))
            return { ...item, match: matching.length / queryWords.length }
        })
        // only include files that actually match the query - contain at least one keyword
        .filter(item => item.match > 0)
}
const addUrlToStreams = async (streams, token) => {
    return Promise.all(streams.map(async stream => {
        try {
            const { ident, ...restStream } = stream
            
            // Přidání podpory pro opakované pokusy získání URL
            const MAX_RETRIES = 3;
            let url = null;
            let attempt = 0;
            
            while (!url && attempt < MAX_RETRIES) {
                attempt++;
                try {
                    const data = formencode({ 
                        ident, 
                        download_type: 'video_stream', 
                        force_https: 1, 
                        wst: token 
                    });
                    
                    const resp = await needle('post', 'https://webshare.cz/api/file_link/', data, { 
                        headers,
                        follow_max: 5 // Sledování přesměrování
                    });
                    
                    if (!resp.body || !resp.body.children) {
                        console.error(`Invalid response for ${ident}, attempt ${attempt}:`, resp.body);
                        // Krátká pauza před dalším pokusem
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }
                    
                    const status = resp.body.children.find(el => el.name == 'status')?.value;
                    
                    if (status === 'OK') {
                        url = resp.body.children.find(el => el.name == 'link')?.value;
                        
                        if (url) {
                            console.log(`URL získána pro ${ident}: ${url.substring(0, 50)}...`);
                            
                            // Zkusíme získat přímou URL bez přesměrování
                            try {
                                const checkResp = await needle('head', url, null, {
                                    follow_max: 5,
                                    headers: {
                                        'User-Agent': headers['User-Agent']
                                    }
                                });
                                
                                if (checkResp.statusCode >= 300 && checkResp.statusCode < 400 && checkResp.headers.location) {
                                    // Pokud server vrátí přesměrování, použijeme přesměrovanou URL
                                    url = checkResp.headers.location;
                                    console.log(`Přesměrovaná URL: ${url.substring(0, 50)}...`);
                                } else if (checkResp.statusCode >= 400) {
                                    console.error(`URL validation failed for ${ident}: status ${checkResp.statusCode}`);
                                    url = null; // reset URL to retry
                                }
                            } catch (e) {
                                console.error(`Error validating URL for ${ident}:`, e.message);
                                // Necháme původní URL, i když validace selhala - může fungovat v přehrávači
                            }
                        }
                    } else {
                        console.error(`Failed to get link for ${ident}, status: ${status}`);
                    }
                } catch (err) {
                    console.error(`Error fetching URL for ${ident}, attempt ${attempt}:`, err.message);
                }
                
                if (!url && attempt < MAX_RETRIES) {
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, attempt * 1500));
                }
            }
            
            if (url) {
                // Přidáme proxy URL, která vyřeší CORS problémy
                // Tato proxy URL bude zpracována serverem a vrátí stream s potřebnými hlavičkami 
                const proxyUrl = `/proxy-stream/${Buffer.from(url).toString('base64')}`;
                
                return { 
                    ...restStream, 
                    url: proxyUrl,
                    // Metadate pro Stremio
                    title: restStream.description || restStream.name, 
                    "behaviorHints": {
                        "notWebReady": false  // stream může být přehrán ve webové verzi Stremio
                    }
                };
            } else {
                console.error(`Failed to get valid URL for ${ident} after ${MAX_RETRIES} attempts`);
                return restStream;
            }
        } catch (error) {
            console.error(`Unexpected error processing stream:`, error);
            return stream;
        }
    }));
};

const webshare = {
    login: async (user, password) => {
        console.log(`Logging in user ${user}`)
        try {
            // get salt
            const saltResp = await needle('https://webshare.cz/api/salt/', `username_or_email=${user}`, headers)
            if (!saltResp.body || !saltResp.body.children) {
                console.error('Failed to get salt:', saltResp.body);
                return null;
            }
            
            const salt = saltResp.body.children.find(el => el.name == 'salt').value

            // login
            const passEncoded = sha1(md5.crypt(password, salt))
            const data = formencode({ username_or_email: user, password: passEncoded, keep_logged_in: 1 })
            const resp = await needle('post', 'https://webshare.cz/api/login/', data, { headers })
            
            if (resp.statusCode != 200 || resp.body.children.find(el => el.name == 'status').value != 'OK') {
                console.error('Login failed:', resp.body);
                return null;
            }
            
            const token = resp.body.children.find(el => el.name == 'token').value;
            console.log('Login successful, token obtained');
            return token;
        } catch (error) {
            console.error('Error during login:', error.message);
            return null;
        }
    },

    // improve movie query by adding year with movies
    // search localized names too
    // we could also combine multiple different queries to get better results
    search: async (showInfo, token) => {
        const queries = getQueries(showInfo)
        let results = await Promise.all(queries.map(query => search(query, token)))
        results = results.flatMap(items => items)

        results.sort((a, b) => {
            if (a.match != b.match) {
                return b.match - a.match
            } else if (a.posVotes != b.posVotes) {
                return b.posVotes - a.posVotes
            } else {
                return b.size - a.size
            }
        })

        return results.map(item => ({
            ident: item.ident,
            description: item.name,
            name: `💾 ${filesize(item.size)} 👍 ${item.posVotes} 👎 ${item.negVotes}`
        })).slice(0, 20)
    },

    // Nahrazení původní implementace naší vylepšenou verzí
    addUrlToStreams: addUrlToStreams
}

module.exports = webshare