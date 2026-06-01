const fs = require('fs');
const path = require('path');
const os = require('os');
const ytSearch = require('yt-search');
const ytdl = require('ytdl-core');

// ডিরেক্টরি এবং ডাটাবেস পাথ
const dbPath = path.join(__dirname, 'database.json');
const audioDbPath = path.join(__dirname, 'audio_db.json');
const audioDir = path.join(__dirname, 'audio');

// অডিও ফোল্ডার ও ডাটাবেস না থাকলে অটোমেটিক তৈরি করে নেবে
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);
if (!fs.existsSync(audioDbPath)) fs.writeFileSync(audioDbPath, JSON.stringify({}));

// AFK এবং ইন্টারেক্টিভ মেনুর জন্য গ্লোবাল মেমোরি
if (!global.afkData) global.afkData = {};
if (!global.userStates) global.userStates = {};

module.exports = async function(message, client) {
    const chat = await message.getChat();
    const prefix = '!'; // মেইন সেটিংসের প্রিফিক্স
    const audioPrefix = '.'; // অডিও এবং ইউটিউব কমান্ডের প্রিফিক্স (.add, .dlt, .play)
    const msgText = message.body ? message.body.toLowerCase().trim() : '';
    const footer = `\n\n> ᴋᴇᴘʟᴀʀ ʙᴏᴛ.ɪɴᴄ`;
    const senderId = message.author || message.from;
    const botId = client.info.wid._serialized;

    // Database Read/Write Logic
    let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    let audioDb = JSON.parse(fs.readFileSync(audioDbPath, 'utf8'));

    // ==========================================
    // ⚙️ 1. GROUP SETTINGS & ANTI-SYSTEMS
    // ==========================================
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

        // Group Settings Commands
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

        // Anti-Status & Unknown Spam
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

        // Anti-Link & Anti-Toxic
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

        // Auto-Sticker Maker
        if (groupConfig.autosticker && message.hasMedia) {
            const media = await message.downloadMedia();
            if (media && (media.mimetype.includes('image') || media.mimetype.includes('video'))) {
                await chat.sendMessage(media, { sendMediaAsSticker: true, stickerName: 'Keplar World', stickerAuthor: 'Deep' });
            }
        }
    }

    // ==========================================
    // 💤 2. AFK MODE (Away From Keyboard)
    // ==========================================
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

    // ==========================================
    // 🚀 3. SERVER STATUS (PING)
    // ==========================================
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

    // ==========================================
    // 🎧 4. ADVANCED AUDIO ADD & SHUFFLE
    // ==========================================
    
    // .add <name> (ট্যাগ করে অডিও সেভ)
    if (msgText.startsWith(audioPrefix + 'add') && message.hasQuotedMsg) {
        const keyword = msgText.replace(audioPrefix + 'add', '').trim();
        if (!keyword) return message.reply(`❌ কোনো নাম দাও! যেমন: .add hi`);

        const quotedMsg = await message.getQuotedMessage();
        
        if (quotedMsg.hasMedia && (quotedMsg.type === 'audio' || quotedMsg.type === 'document')) {
            const media = await quotedMsg.downloadMedia();
            
            const isM4A = media.mimetype.includes('mp4') || media.mimetype.includes('m4a');
            const ext = isM4A ? '.m4a' : '.mp3';
            const fileName = `${keyword}_${Date.now()}${ext}`;
            const filePath = path.join(audioDir, fileName);
            
            fs.writeFileSync(filePath, media.data, 'base64');
            
            if (!audioDb[keyword]) audioDb[keyword] = [];
            audioDb[keyword].push(fileName);
            fs.writeFileSync(audioDbPath, JSON.stringify(audioDb, null, 4));
            
            await message.reply(`✅ '${keyword}' কীওয়ার্ডে অডিওটি সেভ হয়েছে! (ফরম্যাট: ${ext})${footer}`);
            return true;
        } else {
            return message.reply(`❌ কমান্ড কাজ করেনি! কোনো অডিও ফাইলকে ট্যাগ (Reply) করে .add লেখো।`);
        }
    }

    // অডিও রিপ্লাই ও শাফল (Shuffle) করা
    if (audioDb[msgText] && audioDb[msgText].length > 0) {
        const filesArray = audioDb[msgText];
        const randomFile = filesArray[Math.floor(Math.random() * filesArray.length)];
        const audioPathToCheck = path.join(audioDir, randomFile);
        
        if (fs.existsSync(audioPathToCheck)) {
            const isM4A = randomFile.endsWith('.m4a'); // m4a হলে ভয়েস নোট, নাহলে নরমাল অডিও
            const media = require('whatsapp-web.js').MessageMedia.fromFilePath(audioPathToCheck);
            await chat.sendMessage(media, { sendAudioAsVoice: isM4A });
            return true;
        }
    }

    // ==========================================
    // 🗑️ 5. INTERACTIVE DELETE SYSTEM (.dlt)
    // ==========================================
    if (msgText === audioPrefix + 'dlt') {
        const keywords = Object.keys(audioDb);
        if (keywords.length === 0) return message.reply(`❌ কোনো অডিও সেভ করা নেই!${footer}`);
        
        let listText = `🗑️ *Saved Audio List*\n\n`;
        keywords.forEach((kw, index) => {
            listText += `${index + 1}. ${kw} (${audioDb[kw].length} files)\n`;
        });
        listText += `\n👉 *যেটি ডিলিট করতে চাও, এই মেসেজটি ট্যাগ (Reply) করে তার নাম্বারটি লেখো।*${footer}`;
        
        global.userStates[senderId] = { action: 'delete_audio', list: keywords };
        await message.reply(listText);
        return true;
    }

    // ==========================================
    // 🎵 6. INTERACTIVE YOUTUBE PLAYER (.play / .song)
    // ==========================================
    if (msgText.startsWith(audioPrefix + 'play ') || msgText.startsWith(audioPrefix + 'song ')) {
        const query = msgText.replace(audioPrefix + 'play ', '').replace(audioPrefix + 'song ', '').trim();
        if (!query) return message.reply("❌ গানের নাম দাও!");

        await message.reply(`🔍 YouTube-এ খোঁজা হচ্ছে...${footer}`);
        
        try {
            const results = await ytSearch(query);
            const top5 = results.videos.slice(0, 5);
            
            if (top5.length === 0) return message.reply("❌ কোনো গান পাওয়া যায়নি!");

            let listText = `🎵 *YouTube Search Results*\n\n`;
            top5.forEach((video, index) => {
                listText += `*${index + 1}.* ${video.title} (${video.timestamp})\n`;
            });
            listText += `\n👉 *গানটি শুনতে এই মেসেজটি ট্যাগ (Reply) করে নাম্বারটি লেখো।*${footer}`;
            
            global.userStates[senderId] = { action: 'yt_play', list: top5 };
            await message.reply(listText);
        } catch (err) {
            await message.reply("❌ সার্চ করতে সমস্যা হয়েছে!");
        }
        return true;
    }

    // ==========================================
    // 🎯 7. INTERACTIVE REPLY HANDLER (Numbers)
    // ==========================================
    if (message.hasQuotedMsg && global.userStates[senderId]) {
        const state = global.userStates[senderId];
        const num = parseInt(msgText);
        
        if (!isNaN(num) && num > 0 && num <= state.list.length) {
            
            // --- ডিলিট অ্যাকশন ---
            if (state.action === 'delete_audio') {
                const keywordToDelete = state.list[num - 1];
                delete audioDb[keywordToDelete];
                fs.writeFileSync(audioDbPath, JSON.stringify(audioDb, null, 4));
                delete global.userStates[senderId]; 
                
                await message.reply(`✅ '${keywordToDelete}' সফলভাবে ডিলিট করা হয়েছে!${footer}`);
                return true;
            }
            
            // --- YouTube প্লে অ্যাকশন ---
            if (state.action === 'yt_play') {
                const video = state.list[num - 1];
                delete global.userStates[senderId]; 
                
                const replyMsg = await message.reply(`⏳ *${video.title}* ডাউনলোড হচ্ছে... দয়া করে অপেক্ষা করো!${footer}`);
                
                try {
                    const tempAudioPath = path.join(audioDir, `yt_${Date.now()}.mp3`);
                    
                    ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' })
                        .pipe(fs.createWriteStream(tempAudioPath))
                        .on('finish', async () => {
                            const media = require('whatsapp-web.js').MessageMedia.fromFilePath(tempAudioPath);
                            await chat.sendMessage(media, { sendAudioAsVoice: false });
                            fs.unlinkSync(tempAudioPath); 
                            await replyMsg.delete(true); 
                        })
                        .on('error', (err) => {
                            message.reply(`❌ ডাউনলোড ফেইল হয়েছে! YouTube আপডেট থাকলে অনেক সময় এমন হয়।${footer}`);
                        });
                } catch (err) {
                    await message.reply("❌ সিস্টেমে সমস্যা হয়েছে!");
                }
                return true;
            }
        }
    }
};
