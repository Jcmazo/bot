const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const server = express();
server.use(bodyParser.json());

const MT4_PORT = 3000;
let derivApiUrl = ''; // Este será configurable desde la interfaz
let telegramToken = '';
let chatId = ''; // ID del chat de Telegram para enviar mensajes

let isBotRunning = false;
let telegramBot;

server.post('/mt4-signal', async (req, res) => {
    if (!isBotRunning) {
        return res.status(403).send('Bot detenido');
    }

    const { symbol, action, volume } = req.body;

    try {
        const response = await axios.post(`${derivApiUrl}/execute`, {
            symbol,
            action,
            volume
        });

        const result = response.data;

        telegramBot.sendMessage(chatId, `Operación ${action} en ${symbol} ejecutada con éxito. Resultado: ${result.result}. Saldo actual: ${result.balance}`);

        res.send('Operación ejecutada y notificada.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al ejecutar la operación');
    }
});

server.listen(MT4_PORT, () => {
    console.log(`Servidor escuchando en el puerto ${MT4_PORT}`);
});

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    ipcMain.handle('start-bot', (event, { apiUrl, token, chat }) => {
        derivApiUrl = apiUrl;
        telegramToken = token;
        chatId = chat;
        telegramBot = new TelegramBot(telegramToken, { polling: true });

        isBotRunning = true;
        telegramBot.sendMessage(chatId, 'Bot iniciado');
    });

    ipcMain.handle('stop-bot', () => {
        isBotRunning = false;
        telegramBot.sendMessage(chatId, 'Bot detenido');
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
