#!/usr/bin/env node

const addonInterface = require("./addon");
const express = require("express");
const http = require('http');
const axios = require('axios');
const cors = require('cors');

const port = process.env.PORT || 3000;

function generateHTML(req) {
    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${host}`;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Stremio Addon</title></head><body><h1>Addon beží na ${baseUrl}</h1><p>manifest: <a href="${baseUrl}/manifest.json">${baseUrl}/manifest.json</a></p></body></html>`;
}

const app = express();
app.use(cors());

// Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Konfigurácia pre Stremio
app.get('/configure', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.send({
        type: "configurable",
        configurable: {
            title: "Webshare Stremio Addon",
            options: [
                {
                    name: "username",
                    title: "Webshare login",
                    type: "text"
                },
                {
                    name: "password",
                    title: "Webshare password",
                    type: "text"
                },
                {
                    name: "realdebrid",
                    title: "Real-Debrid API Key",
                    type: "text"
                },
                {
                    name: "useRealDebrid",
                    title: "Použiť Real-Debrid?",
                    type: "select",
                    options: ["áno", "nie"]
                }
            ]
        }
    });
});

// Manifest
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(addonInterface.manifest);
    console.log('Manifest sent');
});

// Základná HTML stránka
app.get(['/', '/index.html'], (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(generateHTML(req));
});

// Stream endpoint
app.get('/:resource/:type/:id/:extra?.json', (req, res, next) => {
    const { resource, type, id } = req.params;
    let extra = {};
    if (req.params.extra) {
        try {
            extra = JSON.parse(decodeURIComponent(req.params.extra));
        } catch (e) {
            console.error('Chyba pri parsovaní extra:', e);
        }
    }

    if (resource === 'stream') {
        if (req.query.config) {
            try {
                extra.config = JSON.parse(decodeURIComponent(req.query.config));
            } catch (e) {
                console.error('Chyba pri parsovaní configu:', e);
            }
        }

        addonInterface.methods[resource]({ type, id, extra })
            .then(result => {
                res.setHeader('Content-Type', 'application/json');
                res.send(result);
            })
            .catch(err => {
                console.error('Stream chyba:', err);
                res.status(500).send({ error: 'Stream error', message: err.message });
            });
    } else {
        next();
    }
});

// 404 fallback
app.use((req, res) => {
    res.status(404).send({ error: 'Not found' });
});

// Spustenie servera
const server = http.createServer(app);
server.listen(port, '0.0.0.0', () => {
    console.log(`Server beží na porte ${port}`);
});

// Chybové zachytávanie
process.on('uncaughtException', (err) => {
    console.error('Neošetrená výnimka:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('Neošetrené promise rejection:', reason);
});
