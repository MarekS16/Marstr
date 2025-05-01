const { addonBuilder } = require("stremio-addon-sdk")
const webshare = require('./webshare')
const realdebrid = require('./realdebrid')
const { findShowInfo } = require("./meta")

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
	"id": "community.coffei.webshare",
	"version": "0.3.1", // Inkrementace verze
	"catalogs": [],
	"resources": ["stream"],
	"types": [
		"movie",
		"series"
	],
	"name": "Webshare.cz with Real-Debrid",
	"description": "Simple webshare.cz search and streaming with Real-Debrid support.",
	"idPrefixes": [
		"tt"
	],
	"behaviorHints": { "configurable": true, "configurationRequired": true },
	"config": [
		{
			"key": "login",
			"type": "text",
			"title": "Webshare.cz login - username or email",
			"required": true
		},
		{
			"key": "password",
			"type": "password",
			"title": "Webshare.cz password",
			"required": true
		},
		{
			"key": "realdebrid_api",
			"type": "password",
			"title": "Real-Debrid API Key (volitelné/optional)",
			"description": "Získejte API klíč na real-debrid.com v sekci Můj účet > API",
			"required": false
		},
		{
			"key": "use_realdebrid",
			"type": "select",
			"title": "Použít Real-Debrid pro streamování / Use Real-Debrid for streaming",
			"options": ["ano", "ne"],
			"default": "ne",
			"required": false
		}
	]
}

const builder = new addonBuilder(manifest)

// Oprava a vylepšení zpracování streamů
builder.defineStreamHandler(async function (args) {
	console.log("Požadavek na stream:", args.id, "s konfigurací:", args.config ? "konfigurace existuje" : "bez konfigurace");
	
	try {
		const info = await findShowInfo(args.type, args.id)
		if (!info) {
			console.log("Nepodařilo se najít informace o filmu/seriálu:", args.id);
			return { streams: [] }
		}
		
		const config = args.config || {}
		
		// Log konfigurace (bez hesla pro bezpečnost)
		console.log(`Konfigurace: login=${config.login ? "zadáno" : "nezadáno"}, password=${config.password ? "zadáno" : "nezadáno"}, realdebrid_api=${config.realdebrid_api ? "zadáno" : "nezadáno"}, use_realdebrid=${config.use_realdebrid}`);
		
		// Kontrola přihlašovacích údajů
		if (!config.login || !config.password) {
			console.log("Chybí přihlašovací údaje Webshare");
			return { 
				streams: [
					{ 
						title: "⚠️ Chybí přihlašovací údaje Webshare",
						url: "https://www.webshare.cz/",
						behaviorHints: { notWebReady: true } // Indikace, že tento stream není přehratelný
					}
				] 
			};
		}
		
		// Přihlášení k Webshare
		console.log("Přihlašování k Webshare...");
		const wsToken = await webshare.login(config.login, config.password)
		
		if (!wsToken) {
			console.log("Neúspěšné přihlášení k Webshare");
			return { 
				streams: [
					{ 
						title: "⚠️ Neplatné přihlašovací údaje Webshare",
						url: "https://www.webshare.cz/",
						behaviorHints: { notWebReady: true }
					}
				] 
			};
		}
		
		console.log("Vyhledávání streamů...");
		const streams = await webshare.search(info, wsToken)
		
		if (!streams || streams.length === 0) {
			console.log("Nebyly nalezeny žádné streamy");
			return { streams: [] }
		}
		
		console.log(`Nalezeno ${streams.length} streamů, získávám URL...`);
		const streamsWithUrl = await webshare.addUrlToStreams(streams, wsToken)
		
		// Filtrujeme streamy, pro které se podařilo získat URL
		const validStreams = streamsWithUrl.filter(stream => stream.url);
		
		if (validStreams.length === 0) {
			console.log("Nepodařilo se získat žádné platné URL");
			return { 
				streams: [
					{ 
						title: "⚠️ Nepodařilo se získat žádné platné streamy",
						url: "https://www.webshare.cz/",
						behaviorHints: { notWebReady: true }
					}
				] 
			};
		}

		// Pokud je nakonfigurováno použití Real-Debrid, pokusíme se získat přímé odkazy
		if (config.realdebrid_api && config.use_realdebrid === 'ano') {
			const rdApiKey = config.realdebrid_api;
			console.log("Kontrola Real-Debrid API klíče...");
			const isValidKey = await realdebrid.validateApiKey(rdApiKey);
			
			if (isValidKey) {
				console.log('Real-Debrid API klíč je platný, použijeme Real-Debrid pro streamování');
				
				// Pro každý stream se pokusíme získat Real-Debrid odkaz
				const rdStreamsPromises = validStreams.map(async (stream) => {
					try {
						if (!stream.url) return stream;
						
						const rdStreamInfo = await realdebrid.getDirectLink(stream.url, rdApiKey);
						if (rdStreamInfo && rdStreamInfo.url) {
							return {
								name: `🚀 RD ${stream.name}`, // Označení Real-Debrid streamů
								title: `🚀 Real-Debrid: ${stream.description || stream.name}`,
								url: rdStreamInfo.url,
								// Nastavení správných MIME typů a behaviorHints pro lepší kompatibilitu se Stremio
								contentType: rdStreamInfo.contentType || 'video/mp4',
								behaviorHints: {
									// Nastavení provozu přes prohlížeč pro lepší kompatibilitu
									notWebReady: false,
									// Přidání dalších nápověd pro přehrávač
									bingeGroup: "rd-webshare",
								}
							};
						}
						return null; // Vracíme null pro streamy, kde se Real-Debrid nepodařil
					} catch (error) {
						console.error("Chyba při zpracování Real-Debrid streamu:", error);
						return null;
					}
				});
				
				// Zpracování všech streamů s Real-Debrid
				const rdStreams = (await Promise.all(rdStreamsPromises))
					.filter(stream => stream !== null); // Odfiltrujeme neúspěšné streamy
				
				if (rdStreams.length > 0) {
					console.log(`Vráceno ${rdStreams.length} Real-Debrid streamů`);
					return { streams: rdStreams };
				} else {
					// Pokud se nepodařilo získat žádné RD streamy, vrátíme standardní Webshare streamy
					console.log('Nepodařilo se získat Real-Debrid streamy, použijeme standardní Webshare streamy');
					return { 
						streams: [
							{ 
								title: "⚠️ Real-Debrid streamování selhalo - používám Webshare streamy",
								url: "https://real-debrid.com/",
								behaviorHints: { notWebReady: true }
							},
							...prepareWebshareStreams(validStreams)
						] 
					};
				}
			} else {
				console.log('Real-Debrid API klíč není platný, použijeme standardní odkazy Webshare');
				return { 
					streams: [
						{ 
							title: "⚠️ Neplatný Real-Debrid API klíč - používám Webshare streamy",
							url: "https://real-debrid.com/",
							behaviorHints: { notWebReady: true }
						},
						...prepareWebshareStreams(validStreams)
					] 
				};
			}
		}

		// Standardní zpracování Webshare streamů
		return { streams: prepareWebshareStreams(validStreams) }
	} catch (error) {
		console.error("Neočekávaná chyba při zpracování streamů:", error);
		return { 
			streams: [
				{ 
					title: `⚠️ Chyba: ${error.message || "Neznámá chyba"}`,
					url: "https://www.webshare.cz/",
					behaviorHints: { notWebReady: true }
				}
			] 
		};
	}
})

// Pomocná funkce pro přípravu Webshare streamů pro Stremio
function prepareWebshareStreams(validStreams) {
	return validStreams.map(stream => ({
		...stream,
		title: stream.description || stream.name,
		// Nastavení MIME typů pro lepší kompatibilitu
		contentType: stream.url?.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'video/x-matroska',
		// Přidání behaviorHints pro lepší přehrávání
		behaviorHints: {
			notWebReady: false,
			bingeGroup: "ws-webshare"
		}
	}));
}

module.exports = builder.getInterface()