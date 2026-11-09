require('dotenv').config();
const http = require('http');
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');

// 1. Render Port Web Server
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Viva P2P Exchange Bot Active 24/7\n');
}).listen(PORT, () => {
  console.log(`Port active: ${PORT}`);
});

// 2. Settings
const BOT_TOKEN = process.env.BOT_TOKEN || '9237982046:AAHH5keW0NVZZqkFQLskv6bq9ew3i09A5Qg';
const ADMIN_ID = parseInt(process.env.ADMIN_ID || '8792715170');
const MAIN_CHANNEL = process.env.MAIN_CHANNEL || '@vivaonlinetech';
const MONGO_URI = process.env.MONGO_URI;

// በዋናው ሜኑ ላይ የሚወጣው ባነር ፎቶ ሊንክ (የራስህን ፎቶ መቀየር ትችላለህ)
const MENU_PHOTO_URL = 'AgACAgQAAxkBAAIB_2rxzvWbuEWg-1HjQGfIHzaKP9lJAAJ0E2sbkwKQU33aGIknoXREAQADAgADeQADPQQ';
// 3. Database Connection
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Atlas Connected successfully!'))
    .catch(err => console.error('MongoDB Error:', err.message));
}

// 4. Schemas
const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  firstName: String,
  username: String,
  step: { type: String, default: 'none' },
  tempOrder: { type: Object, default: {} }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  telegramId: { type: Number, required: true },
  username: String,
  firstName: String,
  orderType: { type: String, default: 'sell' },
  amount: Number,
  totalEtb: Number,
  rate: Number,
  bankOrNetwork: String,
  accountOrWallet: String,
  accountName: String,
  userProofPhotoId: String,
  status: { type: String, default: '⏳ በመጠባበቅ ላይ' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);

const bot = new Telegraf(BOT_TOKEN);

async function getUser(id, ctx) {
  try {
    let u = await User.findOne({ telegramId: id });
    if (!u) {
      u = await User.create({
        telegramId: id,
        firstName: ctx?.from?.first_name || '',
        username: ctx?.from?.username || '',
        step: 'none',
        tempOrder: {}
      });
    }
    return u;
  } catch (err) {
    return { step: 'none', tempOrder: {} };
  }
}

// ኪቦርዶች
const mainKeyboard = Markup.keyboard([
  ['🔴 USDT ለመሸጥ', '🟢 USDT ለመግዛት'],
  ['📊 የዛሬ ዋጋ', '📋 ትዕዛዞቼ'],
  ['❓ ድጋፍ']
]).resize();

const cancelKeyboard = Markup.keyboard([['🔻 ሰርዝ']]).resize();
const backKeyboard = Markup.keyboard([['🔙 ወደ ዋናው ሜኑ ተመለስ']]).resize();

// ==================== 🔐 CHANNEL JOIN CHECKER ====================
async function checkChannelJoined(ctx, userId) {
  if (userId === ADMIN_ID) return true; // አድሚን ሁልጊዜ ያልፋል
  try {
    const member = await ctx.telegram.getChatMember(MAIN_CHANNEL, userId);
    return ['creator', 'administrator', 'member', 'restricted'].includes(member.status);
  } catch (err) {
    console.error('Channel check error (Ensure bot is admin in channel):', err.message);
    return true; // ቻናሉ ላይ ችግር ቢያጋጥም እንዳይዘጋ
  }
}

async function sendJoinPrompt(ctx) {
  const channelLink = MAIN_CHANNEL.startsWith('@') 
    ? `https://t.me/${MAIN_CHANNEL.replace('@', '')}` 
    : MAIN_CHANNEL;

  const joinMsg = 
    `⚠️ <b>ይቅርታ፣ ቦቱን ለመጠቀም መጀመሪያ ቻናላችንን መቀላቀል አለብዎት!</b>\n\n` +
    `👉 <b>እባክዎ ከታች ያለውን ሊንክ ተጭነው ቻናሉን ከተቀላቀሉ በኋላ «✅ ተቀላቅያለሁ (Check)» የሚለውን ይጫኑ፡-</b>`;

  const joinKb = Markup.inlineKeyboard([
    [Markup.button.url('📢 ቻናሉን ተቀላቀል (Join Channel)', channelLink)],
    [Markup.button.callback('✅ ተቀላቅያለሁ (Check)', 'check_joined')]
  ]);

  return ctx.reply(joinMsg, { parse_mode: 'HTML', ...joinKb });
}

// ዋናውን ሜኑ ከፎቶ ጋር የሚያሳይ ተግባር
async function sendMainMenu(ctx) {
  const welcomeCaption = 
    `<tg-emoji emoji-id="5413366476251866707">👋</tg-emoji> <b>እንኳን ወደ VIVA TECH EXCHANGE በደህና መጡ!</b> <tg-emoji emoji-id="6266794310671275367">💕</tg-emoji>\n\n` +
    `<tg-emoji emoji-id="5965043124068687455">🔐</tg-emoji> <b>ደህንነቱ የተጠበቀ እና ⚡️ እጅግ ፈጣን የ USDT 💲 መገበያያ ቤት!</b>\n\n` +
    `<tg-emoji emoji-id="5406745015365943482">👇</tg-emoji> <b>የሚፈልጉትን አገልግሎት ከታች ካሉት አማራጮች ይምረጡ፡-</b>`;

  try {
    await ctx.replyWithPhoto(MENU_PHOTO_URL, {
      caption: welcomeCaption,
      parse_mode: 'HTML',
      ...mainKeyboard
    });
  } catch (err) {
    console.error('Photo send error:', err.message);
    await ctx.reply(welcomeCaption, {
      parse_mode: 'HTML',
      ...mainKeyboard
    });
  }
}

// ==================== START ====================
bot.start(async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) {
    return sendJoinPrompt(ctx);
  }

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { step: 'none', tempOrder: {}, firstName: ctx.from.first_name, username: ctx.from.username },
    { upsert: true }
  );

  return sendMainMenu(ctx);
});

// ተቀላቅያለሁ የሚለውን Callback ሲነካ ማጣራት
bot.action('check_joined', async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (isJoined) {
    await ctx.deleteMessage().catch(() => {});
    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'none', tempOrder: {} },
      { upsert: true }
    );
    await ctx.reply('🎉 <b>እንኳን ደህና መጡ! ቻናሉን በተሳካ ሁኔታ ተቀላቅለዋል።</b>', { parse_mode: 'HTML' });
    return sendMainMenu(ctx);
  } else {
    return ctx.answerCbQuery('❌ እስካሁን ቻናሉን አልተቀላቀሉም! እባክዎ መጀመሪያ Join ይበሉ።', { show_alert: true });
  }
});

// ==================== BACK & CANCEL ====================
bot.hears(['🔻 ሰርዝ', 'ሰርዝ', '🔙 ወደ ዋናው ሜኑ ተመለስ', 'ወደ ዋናው ሜኑ ተመለስ'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { step: 'none', tempOrder: {} });
  return sendMainMenu(ctx);
});

// ==================== RATES ====================
bot.hears(['📊 የዛሬ ዋጋ', 'የዛሬ ዋጋ'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const rateMsg = 
    `📊 <b>የዛሬ የምንዛሬ ተመን (TODAY'S RATES)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🔺 <b>የምንሸጥበት ዋጋ፦</b> <b>1 USDT = 193 ETB</b>\n` +
    `🔻 <b>የምንገዛበት ዋጋ፦</b> <b>1 USDT = 180 ETB</b> (እንደ መጠኑ ይለያያል)\n\n` +
    `💼 <b>የምንቀበልበት / የምንልክበት አውታሮች፦</b>\n` +
    `• 🟠 Binance ID\n` +
    `• 🟡 USDT (BEP-20)\n` +
    `• 🔵 TON\n` +
    `• ⚪ LTC\n\n` +
    `<blockquote>⚡️ <b>ፈጣን እና አስተማማኝ ክፍያ በቴሌብር እና በሁሉም ባንኮች!</b></blockquote>`;
  return ctx.reply(rateMsg, { parse_mode: 'HTML', ...backKeyboard });
});

// ==================== SUPPORT ====================
bot.hears(['❓ ድጋፍ', 'ድጋፍ'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const supportMsg = 
    `📞 <b>የደንበኞች ድጋፍ እና ማህበረሰብ</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👉 <b>ማንኛውም ጥያቄ ወይም እርዳታ ከፈለጉ ያናግሩን፡-</b>\n\n` +
    `👤 <b>Admin Support፦</b> @VT_On\n` +
    `📢 <b>Telegram Channel፦</b> ${MAIN_CHANNEL}\n\n` +
    `⏰ <b>የስራ ሰዓት፦ 24/7 ሁልጊዜ ዝግጁ ነን!</b>`;
  return ctx.reply(supportMsg, { parse_mode: 'HTML', disable_web_page_preview: true, ...backKeyboard });
});

// ==================== ORDERS ====================
bot.hears(['📋 ትዕዛዞቼ', 'ትዕዛዞቼ'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const lastOrder = await Order.findOne({ telegramId: ctx.from.id }).sort({ createdAt: -1 });
  if (!lastOrder) {
    return ctx.reply('📋 <b>እስካሁን ምንም ዓይነት ትዕዛዝ አልፈጸሙም!</b>', { parse_mode: 'HTML' });
  }

  let details = '';
  if (lastOrder.orderType === 'sell') {
    details = 
      `🔄 <b>ዓይነት፦</b> <b>USDT መሸጥ</b>\n` +
      `💵 <b>የተሸጠው መጠን፦</b> <b>${lastOrder.amount} USDT</b>\n` +
      `💰 <b>የሚከፈለው ብር፦</b> <b>${lastOrder.totalEtb} ETB</b>\n` +
      `🏦 <b>የተላከበት አካውንት፦</b> <code>${lastOrder.accountOrWallet}</code>\n`;
  } else {
    details = 
      `🔄 <b>ዓይነት፦</b> <b>USDT መግዛት</b>\n` +
      `💵 <b>የተገዛው መጠን፦</b> <b>${lastOrder.amount} USDT</b>\n` +
      `💰 <b>የተከፈለው ብር፦</b> <b>${lastOrder.totalEtb} ETB</b>\n` +
      `🎯 <b>የመቀበያ Wallet/ID፦</b> <code>${lastOrder.accountOrWallet}</code>\n`;
  }

  const msg = 
    `📋 <b>የመጨረሻ ትዕዛዝዎ ሁኔታ</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    details +
    `📊 <b>ሁኔታ፦</b> <b>${lastOrder.status}</b>\n\n` +
    `<blockquote>⚠️ <b>ትዕዛዝዎ በ Admin ተጣርቶ ምላሽ ይሰጠዋል።</b></blockquote>`;

  return ctx.reply(msg, { parse_mode: 'HTML' });
});

// ==================== 🔴 SELL USDT ====================
bot.hears(['🔴 USDT ለመሸጥ', 'USDT ለመሸጥ'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const msg = 
    `💵 <b>የ USDT መሸጫ ገጽ (SELL USDT)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📊 <b>የዛሬ የመሸጫ ተመኖች (Rates)፦</b>\n\n` +
    `• 🔸 <b>ከ 0.5 – 0.99 USDT፦</b> <b>175 ETB</b>\n` +
    `• 🔹 <b>ከ 1.0 – 15.0 USDT፦</b> <b>180 ETB</b>\n` +
    `• 💎 <b>ከ 16.0 USDT በላይ፦</b> <b>182 ETB</b>\n\n` +
    `📌 <b>ዝቅተኛ የመሸጫ መጠን፦</b> <b>0.5 USDT</b>\n\n` +
    `👉 <b>ለመቀጠል «✅ ተስማምቻለሁ» የሚለውን ይጫኑ፡-</b>`;

  const kb = Markup.keyboard([['✅ ተስማምቻለሁ'], ['🔻 ሰርዝ']]).resize();
  return ctx.reply(msg, { parse_mode: 'HTML', ...kb });
});

bot.hears(['✅ ተስማምቻለሁ', 'ተስማምቻለሁ'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { step: 'waiting_sell_amount', 'tempOrder.orderType': 'sell' },
    { upsert: true }
  );

  return ctx.reply(
    `<b>መሸጥ የሚፈልጉትን የ USDT መጠን በቁጥር ብቻ ያስገቡ፡-</b>\n\n🔻 <b>ዝቅተኛው መጠን 0.5 USDT ነው</b>`,
    { parse_mode: 'HTML', ...cancelKeyboard }
  );
});

bot.hears(['🏦 Telebirr', 'Telebirr', 'ቴሌብር'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { step: 'waiting_telebirr', 'tempOrder.bank': 'Telebirr' }
  );

  return ctx.reply(
    `📱 <b>እባክዎ የ Telebirr ስልክ ቁጥርዎን ያስገቡ፡-</b>\n\n💡 <b>ምሳሌ፦</b> <code>0912345678</code>`,
    { parse_mode: 'HTML', ...cancelKeyboard }
  );
});

bot.hears(['🏦 CBE ንግድ ባንክ', 'CBE ንግድ ባንክ', 'CBE', 'ንግድ ባንክ'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { step: 'waiting_cbe', 'tempOrder.bank': 'CBE' }
  );

  return ctx.reply(
    `🏦 <b>እባክዎ የ CBE Account ቁጥርዎን ያስገቡ፡-</b>\n\n💡 <b>ምሳሌ፦</b> <code>1000764146453</code>`,
    { parse_mode: 'HTML', ...cancelKeyboard }
  );
});

// ==================== 🟢 BUY USDT ====================
bot.hears(['🟢 USDT ለመግዛት', 'USDT ለመግዛት'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const msg = 
    `📈 <b>የዛሬ የ USDT መግዣ ተመን (Rate)</b>\n\n` +
    `💵 <b>1 USDT = 193 ETB</b>\n\n` +
    `👉 <b>በዚህ ተመን ለመግዛት ተስማምተዋል?</b>`;

  const kb = Markup.keyboard([['✅ ተስማምቻለሁ (መግዛት)'], ['🔻 ሰርዝ']]).resize();
  return ctx.reply(msg, { parse_mode: 'HTML', ...kb });
});

bot.hears(['✅ ተስማምቻለሁ (መግዛት)', 'ተስማምቻለሁ (መግዛት)'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { step: 'waiting_buy_amount', 'tempOrder.orderType': 'buy' },
    { upsert: true }
  );

  return ctx.reply(
    `📥 <b>መግዛት የሚፈልጉትን የ USDT መጠን በቁጥር ብቻ ያስገቡ፡-</b>\n\n⛔ <b><i>ዝቅተኛው መጠን 1 💲 USDT ነው!</i></b>`,
    { parse_mode: 'HTML', ...cancelKeyboard }
  );
});

// ==================== TEXT INPUTS ====================
bot.on('text', async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const text = ctx.message.text.trim();
  const user = await getUser(ctx.from.id, ctx);
  const step = user.step || 'none';

  if (step === 'waiting_sell_amount') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount < 0.5) {
      return ctx.reply('⚠️ <b>እባክዎ ትክክለኛ መጠን ያስገቡ! (ዝቅተኛው 0.5 USDT ነው)</b>', { parse_mode: 'HTML' });
    }

    let rate = 180;
    if (amount >= 0.5 && amount < 1.0) rate = 175;
    else if (amount > 15.0) rate = 182;

    const totalEtb = (amount * rate).toFixed(2);
    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      {
        step: 'waiting_bank_selection',
        'tempOrder.amount': amount,
        'tempOrder.rate': rate,
        'tempOrder.totalEtb': totalEtb
      }
    );

    const bankMsg = 
      `💵 <b>የሚሸጡት መጠን፦</b> <b>${amount} USDT</b>\n` +
      `📊 <b>የምንዛሬ ተመን፦</b> <b>1 USDT = ${rate} ETB</b>\n` +
      `💰 <b>የሚቀበሉት ጠቅላላ ብር፦</b> <b>${totalEtb} ETB</b>\n\n` +
      `🏦 <b>ገንዘብ መቀበል የሚፈልጉትን ባንክ ከታች ይምረጡ፡-</b>`;

    const bankKb = Markup.keyboard([
      ['🏦 Telebirr', '🏦 CBE ንግድ ባንክ'],
      ['🔻 ሰርዝ']
    ]).resize();

    return ctx.reply(bankMsg, { parse_mode: 'HTML', ...bankKb });
  }

  if (step === 'waiting_telebirr') {
    let clean = text.replace(/[^0-9]/g, '');
    if (clean.length === 9 && clean.startsWith('9')) clean = '0' + clean;

    if (clean.length !== 10 || (!clean.startsWith('09') && !clean.startsWith('07'))) {
      return ctx.reply('⚠️ <b>ያስገቡት የቴሌብር ስልክ ትክክል አይደለም!</b> (ምሳሌ፦ <code>0912345678</code>)', { parse_mode: 'HTML' });
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_account_name', 'tempOrder.accountOrWallet': clean }
    );

    return ctx.reply(
      `👤 <b>እባክዎ የ Telebirr አካውንትዎን ሙሉ ስም ያስገቡ፡-</b>\n\n💡 <b>ምሳሌ፦</b> Abebe Kebede`,
      { parse_mode: 'HTML', ...cancelKeyboard }
    );
  }

  if (step === 'waiting_cbe') {
    const clean = text.replace(/[^0-9]/g, '');
    if (clean.length !== 13 || !clean.startsWith('1000')) {
      return ctx.reply('⚠️ <b>የ CBE አካውንት 13 ድጂት እና በ 1000 የሚጀምር መሆን አለበት!</b>', { parse_mode: 'HTML' });
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_account_name', 'tempOrder.accountOrWallet': clean }
    );

    return ctx.reply(
      `👤 <b>እባክዎ የባንክ አካውንትዎን ሙሉ ስም ያስገቡ፡-</b>\n\n💡 <b>ምሳሌ፦</b> Abebe Kebede`,
      { parse_mode: 'HTML', ...cancelKeyboard }
    );
  }

  if (step === 'waiting_account_name') {
    if (text.length < 3) return ctx.reply('⚠️ እባክዎ ትክክለኛ ሙሉ ስም ያስገቡ!');

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_sell_network', 'tempOrder.accountName': text }
    );

    const askNet = 
      `✅ <b>የክፍያ መቀበያ መረጃዎ ተመዝግቧል!</b>\n` +
      `👤 <b>የአካውንት ስም፦</b> <b>${text}</b>\n\n` +
      `👉 <b>ክሪፕቶውን (USDT) በምን ኔትወርክ ነው የሚልኩልን?</b>`;

    const netKb = Markup.keyboard([
      ['🟠 Binance ID', '🟡 USDT (BEP-20)'],
      ['🔵 TON', '⚪ LTC'],
      ['🔻 ሰርዝ']
    ]).resize();

    return ctx.reply(askNet, { parse_mode: 'HTML', ...netKb });
  }

  if (step === 'waiting_sell_network') {
    const sellAmt = user.tempOrder?.amount || 1;
    let promptAddr = '';

    if (text.includes('Binance ID')) {
      promptAddr = `🆔 <b>የእኛ የ Binance Pay ID፦</b>\n<code>1235571510</code>\n\n💵 <b>የሚልኩት መጠን፦</b> <b>${sellAmt} USDT</b>`;
    } else if (text.includes('USDT')) {
      promptAddr = `🔗 <b>የእኛ የ USDT (BEP-20) አድራሻ፦</b>\n<code>0x71fc1a6977685e97a57650f5ac858e30a4df944d</code>\n\n💵 <b>የሚልኩት መጠን፦</b> <b>${sellAmt} USDT</b>`;
    } else if (text.includes('TON')) {
      promptAddr = `💎 <b>የእኛ የ TON አድራሻ፦</b>\n<code>UQCYZuyq_s8DJfrWuShnug1c26nj2G6mTvtVjQLN7zOoxIVM</code>\n\n💵 <b>የሚልኩት መጠን፦</b> <b>${sellAmt} USDT</b>`;
    } else if (text.includes('LTC')) {
      promptAddr = `🪙 <b>የእኛ የ LTC አድራሻ፦</b>\n<code>Lg68k7nCgCHYxdSs31RnpYe13ge77fRrZV</code>\n\n💵 <b>የሚልኩት መጠን፦</b> <b>${sellAmt} USDT ዋጋ ያለው LTC</b>`;
    } else {
      return ctx.reply('⚠️ እባክዎ ከታች ካሉት አማራጮች አንዱን ይምረጡ።');
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_screenshot', 'tempOrder.bankOrNetwork': text }
    );

    return ctx.reply(
      promptAddr + `\n\n📸 <b>ክፍያውን እንደፈጸሙ የደረሰኝ ስክሪንሾት (Screenshot) ከስር ይላኩ፡-</b>`,
      { parse_mode: 'HTML', ...cancelKeyboard }
    );
  }

  if (step === 'waiting_buy_amount') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount < 1) {
      return ctx.reply('⚠️ <b>እባክዎ ትክክለኛ መጠን ያስገቡ! (ዝቅተኛው መግዛት 1 USDT ነው)</b>', { parse_mode: 'HTML' });
    }

    const totalEtb = (amount * 193).toFixed(2);
    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      {
        step: 'waiting_buy_network',
        'tempOrder.amount': amount,
        'tempOrder.rate': 193,
        'tempOrder.totalEtb': totalEtb
      }
    );

    const askNet = 
      `💵 <b>የሚገዙት መጠን፦</b> <b>${amount} USDT</b> (${totalEtb} ETB)\n\n` +
      `👉 <b>ገንዘብዎን (USDT) በምንድነው መቀበል የሚፈልጉት❓</b>\n\n` +
      `🎯 <b>እባክዎ ከታች ካሉት አማራጮች አንዱን ይምረጡ፡-</b>`;

    const netKb = Markup.keyboard([
      ['🟠 Binance ID', '🟡 USDT (BEP-20)'],
      ['🔵 TON', '🟣 Aptos'],
      ['🔻 ሰርዝ']
    ]).resize();

    return ctx.reply(askNet, { parse_mode: 'HTML', ...netKb });
  }

  if (step === 'waiting_buy_network') {
    let promptMsg = '';
    if (text.includes('Binance ID')) {
      promptMsg = '🆔 <b>እባክዎ የ Binance Pay ID ቁጥርዎን ያስገቡ፡-</b>\n\n💡 <b>ምሳሌ፦</b> <code>1197432698</code>';
    } else if (text.includes('USDT')) {
      promptMsg = '🔗 <b>እባክዎ የ USDT (BEP-20) መቀበያ አድራሻዎን ያስገቡ፡-</b>\n\n💡 <b>ምሳሌ፦</b> <code>0x71C83920F...</code>';
    } else if (text.includes('TON')) {
      promptMsg = '💎 <b>እባክዎ የ TON Wallet አድራሻዎን ያስገቡ፡-</b>\n\n💡 <b>ምሳሌ፦</b> <code>UQCYZuyq...</code>';
    } else if (text.includes('Aptos')) {
      promptMsg = '🟣 <b>እባክዎ የ Aptos Wallet አድራሻዎን ያስገቡ፡-</b>\n\n💡 <b>ምሳሌ፦</b> <code>0x...</code>';
    } else {
      return ctx.reply('⚠️ እባክዎ ከታች ካሉት አማራጮች አንዱን ይምረጡ።');
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_wallet_address', 'tempOrder.bankOrNetwork': text }
    );

    return ctx.reply(promptMsg, { parse_mode: 'HTML', ...cancelKeyboard });
  }

  if (step === 'waiting_wallet_address') {
    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_screenshot', 'tempOrder.accountOrWallet': text }
    );

    const updatedUser = await User.findOne({ telegramId: ctx.from.id });
    const buyAmt = updatedUser.tempOrder?.amount;
    const totalEtb = updatedUser.tempOrder?.totalEtb;
    const net = updatedUser.tempOrder?.bankOrNetwork;

    const payAccounts = 
      `💳 <b>የክፍያ መፈጸሚያ የባንክ ሂሳቦች</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 <b>የሚገዙት መጠን፦</b> <b>${buyAmt} USDT</b>\n` +
      `💰 <b>የሚከፍሉት ጠቅላላ ብር፦</b> <b>${totalEtb} ETB</b>\n` +
      `🎯 <b>መቀበያዎ፦</b> <code>${text}</code> (${net})\n\n` +
      `👉 <b>እባክዎ ትክክለኛውን ብር ከታች ባሉት አማራጮች ገቢ ያድርጉ፡-</b>\n\n` +
      `📱 <b>Telebirr፦</b> <code>0962963500</code>\n` +
      `👤 <b>ስም፦</b> <b>Asegidew</b>\n\n` +
      `🏦 <b>CBE ንግድ ባንክ፦</b> <code>1000764146453</code>\n` +
      `👤 <b>ስም፦</b> <b>Rediet Mulugeta</b>\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📸 <b>ክፍያውን እንደፈጸሙ የከፈሉበትን ደረሰኝ (Screenshot) ከስር ይላኩ፡-</b>`;

    return ctx.reply(payAccounts, { parse_mode: 'HTML', ...cancelKeyboard });
  }

  return sendMainMenu(ctx);
});

// ==================== 📸 SCREENSHOT መላኪያ ክፍል ====================
async function handleUserScreenshot(ctx, fileId) {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const user = await getUser(ctx.from.id, ctx);
  const temp = user.tempOrder || {};
  const orderId = 'ORD-' + Date.now();

  await Order.create({
    orderId,
    telegramId: ctx.from.id,
    username: ctx.from.username || '',
    firstName: ctx.from.first_name || '',
    orderType: temp.orderType || 'sell',
    amount: temp.amount || 0,
    totalEtb: temp.totalEtb || 0,
    rate: temp.rate || 0,
    bankOrNetwork: temp.bankOrNetwork || temp.bank || 'Telebirr',
    accountOrWallet: temp.accountOrWallet || '-',
    accountName: temp.accountName || '',
    userProofPhotoId: fileId,
    status: '⏳ በመጠባበቅ ላይ (Pending)'
  });

  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { step: 'none', tempOrder: {} });

  const userReplyMsg = 
    `✅ <b>ትዕዛዝዎ እና የከፈሉበት ደረሰኝ በተሳካ ሁኔታ ደርሶናል!</b>\n\n` +
    `👨‍💻 <b>መረጃዎ ወደ Admin ተልኳል፤ በጥቂት ደቂቃዎች ውስጥ ተጣርቶ ምላሽ ይሰጥዎታል።</b>\n\n` +
    `🙏 <b>ቪቫ ፒ ቱ ፒ (Viva P2P Exchange) ን ስለመረጡ እናመሰግናለን!</b>`;

  await ctx.reply(userReplyMsg, { parse_mode: 'HTML', ...mainKeyboard });

  let adminCaption = '';
  if (temp.orderType === 'buy') {
    adminCaption = 
      `🟢 <b>አዲስ የUSDT ግዢ (Buy) ደረሰኝ ደርሷል!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>የትዕዛዝ ቁጥር፦</b> <code>${orderId}</code>\n` +
      `👤 <b>ደንበኛ፦</b> @${ctx.from.username || 'የለውም'} (${ctx.from.first_name})\n` +
      `🆔 <b>Telegram ID፦</b> <code>${ctx.from.id}</code>\n` +
      `💵 <b>የሚገዛው መጠን፦</b> <b>${temp.amount || 0} USDT</b>\n` +
      `💰 <b>የከፈለው ብር፦</b> <b>${temp.totalEtb || 0} ETB</b>\n` +
      `🔗 <b>ኔትወርክ፦</b> ${temp.bankOrNetwork}\n` +
      `🎯 <b>የደንበኛው ዋሌት/ID፦</b> <code>${temp.accountOrWallet}</code>\n\n` +
      `👇 <b>ክፍያው ትክክል ከሆነ ያጽድቁ፡-</b>`;
  } else {
    adminCaption = 
      `🚨 <b>አዲስ የUSDT ሽያጭ (Sell) ደረሰኝ ደርሷል!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>የትዕዛዝ ቁጥር፦</b> <code>${orderId}</code>\n` +
      `👤 <b>ደንበኛ፦</b> @${ctx.from.username || 'የለውም'} (${ctx.from.first_name})\n` +
      `🆔 <b>Telegram ID፦</b> <code>${ctx.from.id}</code>\n` +
      `🏦 <b>ባንክ፦</b> <b>${temp.bank}</b>\n` +
      `👤 <b>የአካውንት ስም፦</b> <b>${temp.accountName}</b>\n` +
      `📱 <b>የደንበኛው አካውንት/ስልክ፦</b> <code>${temp.accountOrWallet}</code>\n` +
      `💵 <b>የሚሸጠው መጠን፦</b> <b>${temp.amount || 0} USDT</b>\n` +
      `💰 <b>እርስዎ የሚልኩለት ብር፦</b> <b>${temp.totalEtb || 0} ETB</b>\n\n` +
      `👇 <b>ክፍያው ትክክል ከሆነ ያጽድቁ፡-</b>`;
  }

  const adminButtons = Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ አጽድቅ (Approve)', `approve_order_${orderId}`),
      Markup.button.callback('❌ ውድቅ አድርግ (Reject)', `reject_order_${orderId}`)
    ]
  ]);

  try {
    await ctx.telegram.sendPhoto(ADMIN_ID, fileId, {
      caption: adminCaption,
      parse_mode: 'HTML',
      ...adminButtons
    });
  } catch (e) {
    await ctx.telegram.sendDocument(ADMIN_ID, fileId, {
      caption: adminCaption,
      parse_mode: 'HTML',
      ...adminButtons
    });
  }
}

bot.on('photo', async (ctx) => {
  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  return handleUserScreenshot(ctx, fileId);
});

bot.on('document', async (ctx) => {
  const fileId = ctx.message.document.file_id;
  return handleUserScreenshot(ctx, fileId);
});

// ==================== 👨‍💻 ADMIN APPROVAL ACTIONS ====================
bot.action(/approve_order_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const order = await Order.findOne({ orderId });

  if (!order) {
    return ctx.reply('⚠️ ይህ ትዕዛዝ አልተገኘም!');
  }

  order.status = '✅ ተጠናቋል (Completed)';
  await order.save();

  let clientSuccessMsg = '';
  if (order.orderType === 'sell') {
    clientSuccessMsg = 
      `🏆 <b>ትዕዛዝዎ በ Admin ጸድቋል!</b> ✅\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💸 <b>ያዘዙት የ ${order.totalEtb} ETB ክፍያ ወደ ሂሳብዎ ገቢ ተደርጓል።</b>\n\n` +
      `📱 <b>የተላከበት ሂሳብ፦</b> <code>${order.accountOrWallet}</code>\n\n` +
      `🌟 <b>ቪቫ ፒ ቱ ፒ (Viva P2P Exchange) ን ስለመረጡ እናመሰግናለን!</b> 🙏`;
  } else {
    clientSuccessMsg = 
      `🏆 <b>ትዕዛዝዎ በ Admin ጸድቋል!</b> ✅\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💎 <b>ያዘዙት ${order.amount} USDT ወደ Wallet/ID አድራሻዎ በተሳካ ሁኔታ ተልኳል!</b>\n\n` +
      `🎯 <b>የተላከበት አድራሻ፦</b> <code>${order.accountOrWallet}</code>\n\n` +
      `🌟 <b>ቪቫ ፒ ቱ ፒ (Viva P2P Exchange) ን ስለመረጡ እናመሰግናለን!</b> 🙏`;
  }

  try {
    await ctx.telegram.sendMessage(order.telegramId, clientSuccessMsg, { parse_mode: 'HTML', ...mainKeyboard });
  } catch (err) {
    console.error('Error sending message to client:', err.message);
  }

  await ctx.editMessageCaption(
    ctx.callbackQuery.message.caption + `\n\n<b>✅ በ Admin ጸድቋል (APPROVED)!</b>`,
    { parse_mode: 'HTML' }
  );

  return ctx.reply(`🎉 ትዕዛዝ #${orderId} ጸድቋል፤ ለደንበኛው የማረጋገጫ መልእክት ደርሶታል!`);
});

bot.action(/reject_order_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const order = await Order.findOne({ orderId });

  if (!order) {
    return ctx.reply('⚠️ ይህ ትዕዛዝ አልተገኘም!');
  }

  order.status = '❌ ውድቅ ተደርጓል (Rejected)';
  await order.save();

  const clientRejectMsg = 
    `🚫 <b>ትዕዛዝዎ ውድቅ ተደርጓል!</b> ❌\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `⚠️ <b>የላኩት የክፍያ ደረሰኝ (Screenshot) ትክክል ስላልሆነ በ Admin ውድቅ ተደርጓል።</b>\n\n` +
    `💬 <b>ለተጨማሪ መረጃ ወይም ቅሬታ ካለዎት Admin ያነጋግሩ፦</b> @VT_On`;

  try {
    await ctx.telegram.sendMessage(order.telegramId, clientRejectMsg, { parse_mode: 'HTML', ...mainKeyboard });
  } catch (err) {
    console.error('Error sending message to client:', err.message);
  }

  await ctx.editMessageCaption(
    ctx.callbackQuery.message.caption + `\n\n<b>❌ በ Admin ውድቅ ተደርጓል (REJECTED)!</b>`,
    { parse_mode: 'HTML' }
  );

  return ctx.reply(`❌ ትዕዛዝ #${orderId} ውድቅ ተደርጓል፤ ለደንበኛው ማሳሰቢያ ተልኳል!`);
});

bot.launch().then(() => {
  console.log('Viva P2P Exchange Bot Active with Channel Join Guard & Photo Menu!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
