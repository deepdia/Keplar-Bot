const fs = require('fs');
const path = require('path');
const os = require('os');
const dbPath = path.join(__dirname, 'database.json');

module.exports = async function(message, client) {
    const chat = await message.getChat();
    const prefix = '!';
    const msgText = message.body ? message.body.toLowerCase().trim() : '';
    const footer = `\n\n> ᴋᴇᴘʟᴀʀ ʙᴏᴛ.ɪɴᴄ`;
    const senderId = message.author || message.from;
    const botId = client.info.wid._serialized;

    // Database Read/Write Logic
    let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (chat.isGroup) {
        const groupId = chat.id._serialized;
        if (!db.groups[groupId]) db.groups[groupId] = { antistatus: false, autosticker: false };
        
        const groupConfig = db.groups[groupId];
        
        // 🎯 Advanced Admin Detection
        let isBotAdmin = false;
        let isAdmin = message.fromMe; 

        for (let participant of chat.participants) {
            if (participant.id._serialized === botId && (participant.isAdmin || participant.isSuperAdmin)) isBotAdmin = true;
            if (participant.id._serialized === senderId && (participant.isAdmin || participant.isSuperAdmin)) isAdmin = true;
        }

        // ⚙️ Group Settings Commands
        if (msgText.startsWith(prefix + 'antistatus')) {
            if (!isAdmin) return message.reply("❌ Only admins can change this!");
            db.groups[groupId].antistatus = msgText.includes('on');
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 4));
            return message.reply(`✅ Anti-Status is now ${db.groups[groupId].antistatus ? 'ON' : 'OFF'}${footer}`);
        }
        if (msgText.startsWith(prefix + 'autosticker')) {
            if (!isAdmin) return message.reply("❌ Only admins can change this!");
            db.groups[groupId].autosticker = msgText.includes('on');
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 4));
            return message.reply(`✅ Auto-Sticker is now ${db.groups[groupId].autosticker ? 'ON' : 'OFF'}${footer}`);
        }

        // 🚫 1. Anti-Status & Unknown Spam
        const isStatusSpam = message.isStatus || message.type === 'status' || message.type === 'unknown' || (message.hasQuotedMsg && (await message.getQuotedMessage()).isStatus);
        if (groupConfig.antistatus && isStatusSpam && !isAdmin) {
            if (isBotAdmin) {
                await chat.sendMessage(`⚠️ *@${senderId.split('@')[0]}*, group e status mention/share nishedh!`, { mentions: [senderId] });
                await message.delete(true);
            } else {
                await chat.sendMessage(`⚠️ *@${senderId.split('@')[0]}*, amake admin koro delete korar jonno!`, { mentions: [senderId] });
            }
            return true;
        }

        // 🛡️ 2. Anti-Link & Anti-Toxic
        const isLink = /https?:\/\//i.test(msgText) || /wa\.me/i.test(msgText) || /chat\.whatsapp\.com/i.test(msgText);
        const badWords = ['bokachoda', 'gandu', 'mc', 'bc', 'fuck'];
        const isToxic = badWords.some(word => msgText.includes(word));
        if (!isAdmin && (isLink || isToxic)) {
            if (isBotAdmin) {
                await message.delete(true);
                const reason = isLink ? "Link share" : "Kharap bhasha";
                await chat.sendMessage(`⚠️ *@${senderId.split('@')[0]}*, group e ${reason} nishedh!`, { mentions: [senderId] });
            }
            return true;
        }

        // 🎨 3. Auto-Sticker Maker
        if (groupConfig.autosticker && message.hasMedia) {
            const media = await message.downloadMedia();
            if (media && (media.mimetype.includes('image') || media.mimetype.includes('video'))) {
                await chat.sendMessage(media, { sendMediaAsSticker: true, stickerName: 'Keplar World', stickerAuthor: 'Deep' });
            }
        }
    }

    // 💤 4. AFK Mode (Away From Keyboard)
    if (global.afkData[senderId]) {
        const timeAfk = Math.floor((Date.now() - global.afkData[senderId].time) / 60000);
        delete global.afkData[senderId];
        await message.reply(`👋 Welcome back! Tumi ${timeAfk} min por phirecho. AFK off kora holo.${footer}`);
    }
    if (msgText.startsWith(prefix + 'afk')) {
        const reason = msgText.replace(prefix + 'afk', '').trim() || 'Busy achi';
        global.afkData[senderId] = { time: Date.now(), reason: reason };
        await message.reply(`💤 Tumi ekhon *AFK* mode e acho.\n▪️ Karon: ${reason}${footer}`);
        return true;
    }
    if (message.mentionedIds && message.mentionedIds.length > 0) {
        for (let mentioned of message.mentionedIds) {
            if (global.afkData[mentioned]) {
                const timeAfk = Math.floor((Date.now() - global.afkData[mentioned].time) / 60000);
                await message.reply(`⚠️ Onake ekhon disturb koro na!\nTini *${timeAfk} min* dhore AFK achen.\n▪️ Karon: ${global.afkData[mentioned].reason}${footer}`);
            }
        }
    }

    // 🚀 5. Advanced Ping Server Check
    if (msgText === prefix + 'ping') {
        const start = Date.now();
        const replyMsg = await message.reply(`⏳ Pinging Keplar Server...${footer}`);
        const pingTime = Date.now() - start;
        const freeRAM = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const details = `🚀 *KEPLAR SERVER STATUS*\n\n⚡ *Ping:* ${pingTime}ms\n💻 *RAM Free:* ${freeRAM} GB\n🖥️ *OS:* ${os.type()}\n${footer}`;
        if (replyMsg.edit) await replyMsg.edit(details);
        else await message.reply(details);
        return true;
    }
};
