// Načteme konfiguraci, s fallbackem na prázdný objekt pro případ, že konfigurace není dostupná
let tmdbApiKey;
try {
  const config = require("../config/keys");
  tmdbApiKey = config.tmdbApiKey;
} catch (error) {
  console.warn("Nepodařilo se načíst konfigurační soubor. TMDB API nebude fungovat.");
  tmdbApiKey = "";
}

const needle = require('needle');

const findShowInfo = async (type, id) => {
    if (type == 'movie') {
        return await findMovieTmdb(type, id) || await findMovieCinemeta(type, id);
    } else if (type == 'series') {
        return await findSeriesTmdb(type, id) || await findSeriesCinemeta(type, id);
    }
};

const findMovieCinemeta = async (type, id) => {
    try {
        const resp = await needle('get', 'https://v3-cinemeta.strem.io/meta/' + type + '/' + id + '.json');
        return resp.body && { name: resp.body.meta.name, originalName: null, type };
    } catch (error) {
        console.error("Chyba při získávání dat z Cinemeta API:", error.message);
        return null;
    }
};

const findSeriesCinemeta = async (type, id) => {
    try {
        const segments = id.split(':');
        if (segments.length == 3) {
            const [id, series, episode] = segments;
            const resp = await needle('get', 'https://v3-cinemeta.strem.io/meta/' + type + '/' + id + '.json');
            return resp.body && { name: resp.body.meta.name, originalName: null, type, series, episode };
        }
        return null;
    } catch (error) {
        console.error("Chyba při získávání dat z Cinemeta API:", error.message);
        return null;
    }
};

// Přidání kontroly pro TMDB API klíč
const hasTmdbApiKey = tmdbApiKey && tmdbApiKey.length > 0;

const tmbdHeaders = {
    accept: 'application/json',
    Authorization: hasTmdbApiKey ? `Bearer ${tmdbApiKey}` : ''
};

const findMovieTmdb = async (type, id) => {
    // Pokud nemáme TMDB API klíč, rovnou přeskočíme
    if (!hasTmdbApiKey) return null;
    
    try {
        const resp = await needle(
            'get',
            `https://api.themoviedb.org/3/find/${id}?external_source=imdb_id&language=cs`,
            null,
            {headers: tmbdHeaders});
        
        if (resp.statusCode == 200) {
            const results = resp.body.movie_results;
            if (results && results.length >= 1) {
                return { name: results[0].title, originalName: results[0].original_title, type };
            }
        }
        return null;
    } catch (error) {
        console.error("Chyba při získávání dat z TMDB API:", error.message);
        return null;
    }
};

const findSeriesTmdb = async (type, id) => {
    // Pokud nemáme TMDB API klíč, rovnou přeskočíme
    if (!hasTmdbApiKey) return null;
    
    try {
        const segments = id.split(':');
        if (segments.length == 3) {
            const [id, series, episode] = segments;
            const resp = await needle(
                'get',
                `https://api.themoviedb.org/3/find/${id}?external_source=imdb_id&language=cs`,
                null,
                {headers: tmbdHeaders});
            
            if (resp.statusCode == 200) {
                const results = resp.body.tv_results;
                if (results && results.length >= 1) {
                    return { name: results[0].name, originalName: results[0].original_name, type, series, episode };
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Chyba při získávání dat z TMDB API:", error.message);
        return null;
    }
};

module.exports = { findShowInfo };