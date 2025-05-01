// Výchozí konfigurační klíče pro nasazení
module.exports = {
    tmdbApiKey: process.env.TMDB_API_KEY || ''  // Pro produkci používáme proměnnou prostředí nebo prázdný řetězec jako fallback
};