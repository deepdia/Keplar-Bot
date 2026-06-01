const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const handler = require('./handler'); // Command File ke call korbe

// ==========================================
// 🛡️ KEPLAR WORLD CORE SECURITY ENGINE
// ==========================================
const _0x1a2b = Buffer.from('a2VwbGFyYm90aW5j', 'base64').toString('utf8'); 
const _0x3c4d = '\x6b\x65\x70\x6c\x61\x72\x62\x6f\x74\x69\x6e\x63'; 

(function verifyNexusCore() {
    try {
        if (_0x1a2b !== _0x3c4d || _0x1a2b.length !== 12) throw new Error("Core Compromised");
        const sysAuth = String.fromCharCode(107, 101, 112, 108, 97, 114, 98, 111, 116, 105, 110, 99);
        if (_0x1a2b !== sysAuth) throw new Error("License Invalid");
        console.log(`✅ [${_0x1a2b.toUpperCase()}] Security Verified. Keplar World Booting...`);
    } catch (error) {
        console.error("🚫 FATAL ERROR: Unauthorized Copy Detected! System Shutdown.");
        process.exit(1); 
    }
})();
// ==========================================

// 🌐 Render Web Server (24/7 On rakhur jonno)
const app = express();
app.get('/', (req, res) => res.send('🚀 Keplar World Server is Online & Running!'));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Web Server Running...'));

// 📱 WhatsApp Client Setup (Linux/Render ready)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

global.afkData = {}; // AFK system er memory

client.on('qr', (qr) => {
    console.log('📲 Scan this QR code in WhatsApp to login:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('🤖 Keplar Bot is Ready and Connected!');
});

// Sob message asle handler.js e pathiye debe
client.on('message', async (message) => {
    await handler(message, client);
});

client.initialize();
