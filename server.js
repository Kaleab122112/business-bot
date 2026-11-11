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

// በዋናው ሜኑ ላይ የሚወጣው ባነር ፎቶ ID
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
  if (userId === ADMIN_ID) return true;
  try {
    const member = await ctx.telegram.getChatMember(MAIN_CHANNEL, userId);
    return ['creator', 'administrator', 'member', 'restricted'].includes(member.status);
  } catch (err) {
    console.error('Channel check error:', err.message);
    return true;
  }
}

async function sendJoinPrompt(ctx) {
  const channelLink = MAIN_CHANNEL.startsWith('@') 
    ? `https://t.me/${MAIN_CHANNEL.replace('@', '')}` 
    : MAIN_CHANNEL;

  const joinMsg = 
    `<tg-emoji emoji-id="5447644880824181073">⚠️</tg-emoji> <b>ይቅርታ፣ ቦቱን ለመጠቀም መጀመሪያ ቻናላችንን መቀላቀል አለብዎት!</b>\n\n` +
    `<tg-emoji emoji-id="5415758949129404605">👉</tg-emoji> <b>እባክዎ ከታች ያለውን ሊንክ ተጭነው ቻናሉን ከተቀላቀሉ በኋላ «<tg-emoji emoji-id="6267118537752450044">✅</tg-emoji> ተቀላቅያለሁ (Check)» የሚለውን ይጫኑ፡-</b>`;

  const joinKb = Markup.inlineKeyboard([
    [Markup.button.url('📢 ቻናሉን ተቀላቀል (Join Channel)', channelLink)],
    [Markup.button.callback('✅ ተቀላቅያለሁ (Check)', 'check_joined')]
  ]);

  return ctx.reply(joinMsg, { parse_mode: 'HTML', ...joinKb });
}

// ==================== 🏠 MAIN MENU ====================
async function sendMainMenu(ctx) {
  const welcomeCaption = 
    `<tg-emoji emoji-id="5911078333168227043">👋</tg-emoji> <b>እንኳን ወደ VIVA TECH EXCHANGE በደህና መጡ!</b> <tg-emoji emoji-id="5271837459783638319">💕</tg-emoji>\n\n` +
    `<tg-emoji emoji-id="5971889748615105853">🔐</tg-emoji> <b>ደህንነቱ የተጠበቀ እና <tg-emoji emoji-id="5978875706195578194">⚡️</tg-emoji> እጅግ ፈጣን የ USDT <tg-emoji emoji-id="5965043124068687455">💲</tg-emoji> መገበያያ ቤት!</b>\n\n` +
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
  if (!isJoined) return sendJoinPrompt(ctx);

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { step: 'none', tempOrder: {}, firstName: ctx.from.first_name, username: ctx.from.username },
    { upsert: true }
  );

  return sendMainMenu(ctx);
});

bot.action('check_joined', async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (isJoined) {
    await ctx.deleteMessage().catch(() => {});
    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'none', tempOrder: {} },
      { upsert: true }
    );
    await ctx.reply(
      `<tg-emoji emoji-id="6267117038808870117">🎉</tg-emoji> <b>እንኳን ደህና መጡ! ቻናሉን በተሳካ ሁኔታ ተቀላቅለዋል።</b>`,
      { parse_mode: 'HTML' }
    );
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
  await ctx.reply(
    `<tg-emoji emoji-id="6266818688905648040">🔙</tg-emoji> <b>ወደ ዋናው ሜኑ ተመልሰዋል!</b>`,
    { parse_mode: 'HTML' }
  );
  return sendMainMenu(ctx);
});

// ==================== RATES ====================
bot.hears(['📊 የዛሬ ዋጋ', 'የዛሬ ዋጋ'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const rateMsg = 
    `<tg-emoji emoji-id="5413879192267805083">📊</tg-emoji> <b>የዛሬ የምንዛሬ ተመን (TODAY'S RATES)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `<tg-emoji emoji-id="5429518319243775957">🔺</tg-emoji> <b>የምንሸጥበት ዋጋ፦</b> <b>1 USDT = 193 ETB</b>\n` +
    `<tg-emoji emoji-id="5429651785352501917">🔻</tg-emoji> <b>የምንገዛበት ዋጋ፦</b> <b>1 USDT = 180 ETB</b> (እንደ መጠኑ ይለያያል)\n\n` +
    `<tg-emoji emoji-id="6267186750423045640">💼</tg-emoji> <b>የምንቀበልበት / የምንልክበት አውታሮች፦</b>\n` +
    `• <tg-emoji emoji-id="5963087638343720061">🟠</tg-emoji> Binance ID\n` +
    `• <tg-emoji emoji-id="5201692367437974073">🟡</tg-emoji> USDT (BEP-20)\n` +
    `• <tg-emoji emoji-id="5377620962390857342">🔵</tg-emoji> TON\n` +
    `• <tg-emoji emoji-id="5202064723922670546">⚪</tg-emoji> LTC\n\n` +
    `<blockquote><tg-emoji emoji-id="5197288647275071607">⚡️</tg-emoji> <b>ፈጣን እና አስተማማኝ ክፍያ በቴሌብር እና በሁሉም ባንኮች!</b></blockquote>`;
  return ctx.reply(rateMsg, { parse_mode: 'HTML', ...backKeyboard });
});

// ==================== SUPPORT ====================
bot.hears(['❓ ድጋፍ', 'ድጋፍ'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const supportMsg = 
    `<tg-emoji emoji-id="5373039692574893940">❓</tg-emoji> <b>የደንበኞች ድጋፍ እና ማህበረሰብ</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `<tg-emoji emoji-id="5415758949129404605">👉</tg-emoji> <b>ማንኛውም ጥያቄ ወይም እርዳታ ከፈለጉ ያናግሩን፡-</b>\n\n` +
    `<tg-emoji emoji-id="5370867268051806190">👤</tg-emoji> <b>Admin Support፦</b> @VT_On\n` +
    `<tg-emoji emoji-id="6267129592998270736">📢</tg-emoji> <b>Telegram Channel፦</b> ${MAIN_CHANNEL}\n\n` +
    `<tg-emoji emoji-id="6285240160120477644">⏰</tg-emoji> <b>የስራ ሰዓት፦ 24/7 ሁልጊዜ ዝግጁ ነን!</b>`;
  return ctx.reply(supportMsg, { parse_mode: 'HTML', disable_web_page_preview: true, ...backKeyboard });
});

// ==================== ORDERS ====================
bot.hears(['📋 ትዕዛዞቼ', 'ትዕዛዞቼ'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const lastOrder = await Order.findOne({ telegramId: ctx.from.id }).sort({ createdAt: -1 });
  if (!lastOrder) {
    return ctx.reply(
      `<tg-emoji emoji-id="5413879192267805083">📋</tg-emoji> <b>እስካሁን ምንም ዓይነት ትዕዛዝ አልፈጸሙም!</b>`,
      { parse_mode: 'HTML' }
    );
  }

  let details = '';
  if (lastOrder.orderType === 'sell') {
    details = 
      `<tg-emoji emoji-id="5429518319243775957">🔄</tg-emoji> <b>ዓይነት፦</b> <b>USDT መሸጥ</b>\n` +
      `<tg-emoji emoji-id="5965043124068687455">💵</tg-emoji> <b>የተሸጠው መጠን፦</b> <b>${lastOrder.amount} USDT</b>\n` +
      `<tg-emoji emoji-id="5445353829304387411">💰</tg-emoji> <b>የሚከፈለው ብር፦</b> <b>${lastOrder.totalEtb} ETB</b>\n` +
      `<tg-emoji emoji-id="5972265777296838427">🏦</tg-emoji> <b>የተላከበት አካውንት፦</b> <code>${lastOrder.accountOrWallet}</code>\n`;
  } else {
    details = 
      `<tg-emoji emoji-id="5429651785352501917">🔄</tg-emoji> <b>ዓይነት፦</b> <b>USDT መግዛት</b>\n` +
      `<tg-emoji emoji-id="5965043124068687455">💵</tg-emoji> <b>የተገዛው መጠን፦</b> <b>${lastOrder.amount} USDT</b>\n` +
      `<tg-emoji emoji-id="5445353829304387411">💰</tg-emoji> <b>የተከፈለው ብር፦</b> <b>${lastOrder.totalEtb} ETB</b>\n` +
      `<tg-emoji emoji-id="5972265777296838427">🎯</tg-emoji> <b>የመቀበያ Wallet/ID፦</b> <code>${lastOrder.accountOrWallet}</code>\n`;
  }

  const msg = 
    `<tg-emoji emoji-id="5413879192267805083">📋</tg-emoji> <b>የመጨረሻ ትዕዛዝዎ ሁኔታ</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    details +
    `<tg-emoji emoji-id="6262597302989362227">📊</tg-emoji> <b>ሁኔታ፦</b> <b>${lastOrder.status}</b>\n\n` +
    `<blockquote><tg-emoji emoji-id="5197269100878907942">⚠️</tg-emoji> <b>ትዕዛዝዎ በ Admin ተጣርቶ ምላሽ ይሰጠዋል።</b></blockquote>`;

  return ctx.reply(msg, { parse_mode: 'HTML' });
});

// ==================== 🔴 SELL USDT ====================
bot.hears(['🔴 USDT ለመሸጥ', 'USDT ለመሸጥ'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const msg = 
    `<tg-emoji emoji-id="5429518319243775957">🔴</tg-emoji> <b>የ USDT መሸጫ ገጽ (SELL USDT)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `<tg-emoji emoji-id="5231200819986047254">📊</tg-emoji> <b>የዛሬ የመሸጫ ተመኖች (Rates)፦</b>\n\n` +
    `• <tg-emoji emoji-id="5972103023806123551">🔸</tg-emoji> <b>ከ 0.5 – 0.99 USDT፦</b> <b>175 ETB</b>\n\n` +
    `• <tg-emoji emoji-id="5971895340662526314">🔹</tg-emoji> <b>ከ 1.0 – 15.0 USDT፦</b> <b>180 ETB</b>\n\n` +
    `• <tg-emoji emoji-id="5972216853324371758">💎</tg-emoji> <b>ከ 16.0 USDT በላይ፦</b> <b>182 ETB</b>\n\n` +
    `<tg-emoji emoji-id="5240241223632954241">🔻</tg-emoji> <b>ዝቅተኛ የመሸጫ መጠን፦</b> <b>0.5 USDT</b>\n\n` +
    `<tg-emoji emoji-id="5397782960512444700">👉</tg-emoji> <b>ለመቀጠል «<tg-emoji emoji-id="6267118537752450044">✅</tg-emoji> ተስማምቻለሁ» የሚለውን ይጫኑ፡-</b>`;

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
    `<b>መሸጥ የሚፈልጉትን የ USDT መጠን በቁጥር ብቻ ያስገቡ፡-</b>\n\n<tg-emoji emoji-id="5240241223632954241">🔻</tg-emoji> <b>ዝቅተኛው መጠን 0.5 USDT ነው</b>`,
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
    `<tg-emoji emoji-id="5796159851734244538">📱</tg-emoji> <b>እባክዎ የ Telebirr ስልክ ቁጥርዎን ያስገቡ፡-</b>\n\n<tg-emoji emoji-id="5467538555158943525">💡</tg-emoji> <b>ምሳሌ፦</b> <code>0912345678</code>`,
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
    `<tg-emoji emoji-id="5961054379350955385">🏦</tg-emoji> <b>እባክዎ የ CBE Account ቁጥርዎን ያስገቡ፡-</b>\n\n<tg-emoji emoji-id="5467538555158943525">💡</tg-emoji> <b>ምሳሌ፦</b> <code>1000764146453</code>`,
    { parse_mode: 'HTML', ...cancelKeyboard }
  );
});

// ==================== 🟢 BUY USDT ====================
bot.hears(['🟢 USDT ለመግዛት', 'USDT ለመግዛት'], async (ctx) => {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const msg = 
    `<tg-emoji emoji-id="5429651785352501917">🟢</tg-emoji> <b>የዛሬ የ USDT መግዣ ተመን (Rate)</b>\n\n` +
    `<tg-emoji emoji-id="5231200819986047254">💵</tg-emoji> <b>1 USDT = 193 ETB</b>\n\n` +
    `<tg-emoji emoji-id="5461117441612462242">👉</tg-emoji> <b>በዚህ ተመን ለመግዛት ተስማምተዋል?</b>`;

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
    `<tg-emoji emoji-id="5429651785352501917">📥</tg-emoji> <b>መግዛት የሚፈልጉትን የ USDT መጠን በቁጥር ብቻ ያስገቡ፡-</b>\n\n<tg-emoji emoji-id="5447644880824181073">⛔</tg-emoji> <b><i>ዝቅተኛው መጠን 1 <tg-emoji emoji-id="5965043124068687455">💲</tg-emoji> USDT ነው!</i></b>`,
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
      return ctx.reply(
        `<tg-emoji emoji-id="5461117441612462242">⚠️</tg-emoji> <b>እባክዎ ትክክለኛ መጠን ያስገቡ! (ዝቅተኛው 0.5 USDT ነው)</b>`,
        { parse_mode: 'HTML' }
      );
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
      `<tg-emoji emoji-id="5972265777296838427">💵</tg-emoji> <b>የሚሸጡት መጠን፦</b> <b>${amount} USDT</b>\n` +
      `<tg-emoji emoji-id="5429651785352501917">📊</tg-emoji> <b>የምንዛሬ ተመን፦</b> <b>1 USDT = ${rate} ETB</b>\n` +
      `<tg-emoji emoji-id="5294167145079395967">💰</tg-emoji> <b>የሚቀበሉት ጠቅላላ ብር፦</b> <b>${totalEtb} ETB</b>\n\n` +
      `<tg-emoji emoji-id="5872702499730759410">🏦</tg-emoji> <b>ገንዘብ መቀበል የሚፈልጉትን ባንክ ከታች ይምረጡ፡-</b>`;

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
      return ctx.reply(
        `<tg-emoji emoji-id="5961054379350955385">⚠️</tg-emoji> <b>ያስገቡት የቴሌብር ስልክ ትክክል አይደለም!</b> (ምሳሌ፦ <code>0912345678</code>)`,
        { parse_mode: 'HTML' }
      );
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_account_name', 'tempOrder.accountOrWallet': clean }
    );

    return ctx.reply(
      `<tg-emoji emoji-id="5282843764451195532">👤</tg-emoji> <b>እባክዎ የ Telebirr አካውንትዎን ሙሉ ስም ያስገቡ፡-</b>\n\n<tg-emoji emoji-id="5260293700088511294">💡</tg-emoji> <b>ምሳሌ፦</b> Abebe Kebede`,
      { parse_mode: 'HTML', ...cancelKeyboard }
    );
  }

  if (step === 'waiting_cbe') {
    const clean = text.replace(/[^0-9]/g, '');
    if (clean.length !== 13 || !clean.startsWith('1000')) {
      return ctx.reply(
        `<tg-emoji emoji-id="5961054379350955385">⚠️</tg-emoji> <b>የ CBE አካውንት 13 ድጂት እና በ 1000 የሚጀምር መሆን አለበት!</b>`,
        { parse_mode: 'HTML' }
      );
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_account_name', 'tempOrder.accountOrWallet': clean }
    );

    return ctx.reply(
      `<tg-emoji emoji-id="5961054379350955385">👤</tg-emoji> <b>እባክዎ የባንክ አካውንትዎን ሙሉ ስም ያስገቡ፡-</b>\n\n<tg-emoji emoji-id="5282843764451195532">💡</tg-emoji> <b>ምሳሌ፦</b> Abebe Kebede`,
      { parse_mode: 'HTML', ...cancelKeyboard }
    );
  }

  if (step === 'waiting_account_name') {
    if (text.length < 3) {
      return ctx.reply(`<tg-emoji emoji-id="6267039884016358504">⚠️</tg-emoji> እባክዎ ትክክለኛ ሙሉ ስም ያስገቡ!`);
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_sell_network', 'tempOrder.accountName': text }
    );

    const askNet = 
      `<tg-emoji emoji-id="5978769938330947487">✅</tg-emoji> <b>የክፍያ መቀበያ መረጃዎ ተመዝግቧል!</b>\n` +
      `<tg-emoji emoji-id="5373012449597335010">👤</tg-emoji> <b>የአካውንት ስም፦</b> <b>${text}</b>\n\n` +
      `<tg-emoji emoji-id="5460750711534926792">👉</tg-emoji> <b>ክሪፕቶውን (USDT) በምን ኔትወርክ ነው የሚልኩልን?</b>`;

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
      promptAddr = `<tg-emoji emoji-id="5963087638343720061">🆔</tg-emoji> <b>የእኛ የ Binance Pay ID፦</b>\n<code>1235571510</code>\n\n<tg-emoji emoji-id="5197269100878907942">💵</tg-emoji> <b>የሚልኩት መጠን፦</b> <b>${sellAmt} USDT</b>`;
    } else if (text.includes('USDT')) {
      promptAddr = `<tg-emoji emoji-id="5201692367437974073">🔗</tg-emoji> <b>የእኛ የ USDT (BEP-20) አድራሻ፦</b>\n<code>0x71fc1a6977685e97a57650f5ac858e30a4df944d</code>\n\n<tg-emoji emoji-id="5197269100878907942">💵</tg-emoji> <b>የሚልኩት መጠን፦</b> <b>${sellAmt} USDT</b>`;
    } else if (text.includes('TON')) {
      promptAddr = `<tg-emoji emoji-id="5377620962390857342">💎</tg-emoji> <b>የእኛ የ TON አድራሻ፦</b>\n<code>UQCYZuyq_s8DJfrWuShnug1c26nj2G6mTvtVjQLN7zOoxIVM</code>\n\n<tg-emoji emoji-id="5197269100878907942">💵</tg-emoji> <b>የሚልኩት መጠን፦</b> <b>${sellAmt} USDT</b>`;
    } else if (text.includes('LTC')) {
      promptAddr = `<tg-emoji emoji-id="5202064723922670546">🪙</tg-emoji> <b>የእኛ የ LTC አድራሻ፦</b>\n<code>Lg68k7nCgCHYxdSs31RnpYe13ge77fRrZV</code>\n\n<tg-emoji emoji-id="5197269100878907942">💵</tg-emoji> <b>የሚልኩት መጠን፦</b> <b>${sellAmt} USDT ዋጋ ያለው LTC</b>`;
    } else {
      return ctx.reply(`<tg-emoji emoji-id="5460935476733033386">⚠️</tg-emoji> እባክዎ ከታች ካሉት አማራጮች አንዱን ይምረጡ።`);
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_screenshot', 'tempOrder.bankOrNetwork': text }
    );

    return ctx.reply(
      promptAddr + `\n\n<tg-emoji emoji-id="5253742260054409879">📸</tg-emoji> <b>ክፍያውን እንደፈጸሙ የደረሰኝ ስክሪንሾት (Screenshot) ከስር ይላኩ፡-</b>`,
      { parse_mode: 'HTML', ...cancelKeyboard }
    );
  }

  // ==================== 🟢 BUY FLOW (መግዣ) ====================
  if (step === 'waiting_buy_amount') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount < 1) {
      return ctx.reply(
        `<tg-emoji emoji-id="5965043124068687455">⚠️</tg-emoji> <b>እባክዎ ትክክለኛ መጠን ያስገቡ! (ዝቅተኛው መግዛት 1 USDT ነው)</b>`,
        { parse_mode: 'HTML' }
      );
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
      `<tg-emoji emoji-id="5965043124068687455">💵</tg-emoji> <b>የሚገዙት መጠን፦</b> <b>${amount} USDT</b> (${totalEtb} ETB)\n\n` +
      `<tg-emoji emoji-id="5201691993775818138">👉</tg-emoji> <b>ገንዘብዎን (USDT) በምንድነው መቀበል የሚፈልጉት❓</b>\n\n` +
      `<tg-emoji emoji-id="5406745015365943482">🎯</tg-emoji> <b>እባክዎ ከታች ካሉት አማራጮች አንዱን ይምረጡ፡-</b>`;

    const netKb = Markup.keyboard([
      ['🟠 Binance ID', '🟡 USDT (BEP-20)'],
      ['🔵 TON', '🟣 Aptos'],
      ['🔻 ሰርዝ']
    ]).resize();

    return ctx.reply(askNet, { parse_mode: 'HTML', ...netKb });
  }

  if (step === 'waiting_buy_network') {
    const buyAmt = user.tempOrder?.amount || 0;
    let promptMsg = '';

    if (text.includes('Binance ID')) {
      promptMsg = `<tg-emoji emoji-id="5963087638343720061">🆔</tg-emoji> <b>እባክዎ የ Binance Pay ID ቁጥርዎን ያስገቡ፡-</b>\n\n<tg-emoji emoji-id="5467538555158943525">💡</tg-emoji> <b>ምሳሌ፦</b> <code>1197432698</code>`;
    } else if (text.includes('USDT')) {
      let warningSuffix = '';

      // መጠኑ ከ 5 USDT በታች ከሆነ ማስጠንቀቂያ ከታች ይሰጣል
      if (buyAmt < 5) {
        warningSuffix = 
          `\n\n<tg-emoji emoji-id="5447644880824181073">⚠️</tg-emoji> <b>ማስጠንቀቂያ፦ በ <tg-emoji emoji-id="5965043124068687455">💲</tg-emoji> USDT (BEP-20) ዝቅተኛው የመግዛት መጠን 5 <tg-emoji emoji-id="5965043124068687455">💲</tg-emoji> ነው! <tg-emoji emoji-id="5445267414562389170">5️⃣</tg-emoji> ከ 5 USDT በታች የሚገዙ ከሆነ ትዕዛዝዎ በ Admin ውድቅ ይደረጋል!</b>`;
      }

      promptMsg = 
        `<tg-emoji emoji-id="5201692367437974073">🔗</tg-emoji> <b>እባክዎ የ USDT (BEP-20) መቀበያ አድራሻዎን ያስገቡ፡-</b>\n\n` +
        `<tg-emoji emoji-id="5467538555158943525">💡</tg-emoji> <b>ምሳሌ፦</b> <code>0x71C83920F...</code>` +
        warningSuffix;
    } else if (text.includes('TON')) {
      promptMsg = `<tg-emoji emoji-id="5377620962390857342">💎</tg-emoji> <b>እባክዎ የ TON Wallet አድራሻዎን ያስገቡ፡-</b>\n\n<tg-emoji emoji-id="5467538555158943525">💡</tg-emoji> <b>ምሳሌ፦</b> <code>UQCYZuyq...</code>`;
    } else if (text.includes('Aptos')) {
      promptMsg = `<tg-emoji emoji-id="5202064723922670546">🟣</tg-emoji> <b>እባክዎ የ LTC Wallet አድራሻዎን ያስገቡ፡-</b>\n\n<tg-emoji emoji-id="5467538555158943525">💡</tg-emoji> <b>ምሳሌ፦</b> <code>Lt...</code>`;
    } else {
      return ctx.reply(`<tg-emoji emoji-id="5467538555158943525">⚠️</tg-emoji> እባክዎ ከታች ካሉት አማራጮች አንዱን ይምረጡ።`);
    }

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_wallet_address', 'tempOrder.bankOrNetwork': text }
    );

    return ctx.reply(promptMsg, { parse_mode: 'HTML', ...cancelKeyboard });
  }

  // 👉 ተጠቃሚው መቀበያ Wallet/ID ሲያስገባ፡ ቀጥታ ለ Admin ፍቃድ መጠየቂያ ይላካል
  if (step === 'waiting_wallet_address') {
    const orderId = 'ORD-' + Date.now();
    const buyAmt = user.tempOrder?.amount;
    const totalEtb = user.tempOrder?.totalEtb;
    const net = user.tempOrder?.bankOrNetwork;

    await Order.create({
      orderId,
      telegramId: ctx.from.id,
      username: ctx.from.username || '',
      firstName: ctx.from.first_name || '',
      orderType: 'buy',
      amount: buyAmt,
      totalEtb: totalEtb,
      rate: 193,
      bankOrNetwork: net,
      accountOrWallet: text,
      status: '⏳ የአድሚን ፍቃድ በመጠባበቅ ላይ'
    });

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_admin_buy_approval', 'tempOrder.accountOrWallet': text, 'tempOrder.currentOrderId': orderId }
    );

    // ለተጠቃሚው የሚላክ መጠበቂያ መልእክት
    await ctx.reply(
      `<tg-emoji emoji-id="5201691993775818138">⏳</tg-emoji> <b>የትዕዛዝ ጥያቄዎ ወደ Admin ተልኳል!</b>\n\n` +
      `<tg-emoji emoji-id="5965043124068687455">💵</tg-emoji> <b>መጠን፦</b> <b>${buyAmt} USDT</b> (${totalEtb} ETB)\n` +
      `<tg-emoji emoji-id="5445353829304387411">🎯</tg-emoji> <b>መቀበያዎ፦</b> <code>${text}</code> (${net})\n\n` +
      `<tg-emoji emoji-id="5400250414929041085">👨‍💻</tg-emoji> <b>እባክዎ Admin እስኪያረጋግጥ ጥቂት ሰከንዶችን ይጠብቁ፤ እንደተፈቀደ የክፍያ አካውንቶች ይላኩሎታል።</b>`,
      { parse_mode: 'HTML', ...cancelKeyboard }
    );

    // ለ Admin የሚላክ የፍቃድ መጠየቂያ
    const adminReqMsg = 
      `<tg-emoji emoji-id="5397782960512444700">🔔</tg-emoji> <b>አዲስ የ USDT ግዢ ጥያቄ ደርሷል (ፍቃድ ይጠይቃል)!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<tg-emoji emoji-id="5332724926216428039">🆔</tg-emoji> <b>ትዕዛዝ ቁጥር፦</b> <code>${orderId}</code>\n` +
      `<tg-emoji emoji-id="5373012449597335010">👤</tg-emoji> <b>ደንበኛ፦</b> @${ctx.from.username || 'የለውም'} (${ctx.from.first_name})\n` +
      `<tg-emoji emoji-id="6266794310671275367">🆔</tg-emoji> <b>ID፦</b> <code>${ctx.from.id}</code>\n` +
      `<tg-emoji emoji-id="5965043124068687455">💵</tg-emoji> <b>የሚገዛው መጠን፦</b> <b>${buyAmt} USDT</b>\n` +
      `<tg-emoji emoji-id="5197371802136892976">💰</tg-emoji> <b>የሚከፍለው ብር፦</b> <b>${totalEtb} ETB</b>\n` +
      `<tg-emoji emoji-id="5224450179368767019">🔗</tg-emoji> <b>ኔትወርክ፦</b> ${net}\n` +
      `<tg-emoji emoji-id="5445353829304387411">🎯</tg-emoji> <b>መቀበያ Wallet/ID፦</b> <code>${text}</code>\n\n` +
      `<tg-emoji emoji-id="5373141891321699086">👉</tg-emoji> <b>ይህ ሰው ክፍያ እንዲፈጽም ይፈቀድ?</b>`;

    const adminReqKb = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ ፍቀድ (ክፍያ ይላክለት)', `permit_buy_${orderId}`),
        Markup.button.callback('❌ ከልክል (Reject)', `deny_buy_${orderId}`)
      ]
    ]);

    return ctx.telegram.sendMessage(ADMIN_ID, adminReqMsg, { parse_mode: 'HTML', ...adminReqKb });
  }

  return sendMainMenu(ctx);
});

// ==================== 👨‍💻 ADMIN PRE-APPROVAL (ፍቃድ መስጫ) ====================
bot.action(/permit_buy_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const order = await Order.findOne({ orderId });

  if (!order) return ctx.reply('⚠️ ትዕዛዙ አልተገኘም!');

  order.status = '⏳ የክፍያ ደረሰኝ በመጠባበቅ ላይ';
  await order.save();

  await User.findOneAndUpdate(
    { telegramId: order.telegramId },
    { step: 'waiting_screenshot' }
  );

  const payAccounts = 
    `<tg-emoji emoji-id="5397782960512444700">💳</tg-emoji> <b>ትዕዛዝዎ ተፈቅዷል፤ ክፍያ መፈጸም ይችላሉ!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<tg-emoji emoji-id="5965043124068687455">💵</tg-emoji> <b>የሚገዙት መጠን፦</b> <b>${order.amount} USDT</b>\n` +
    `<tg-emoji emoji-id="6266818688905648040">💰</tg-emoji> <b>የሚከፍሉት ጠቅላላ ብር፦</b> <b>${order.totalEtb} ETB</b>\n` +
    `<tg-emoji emoji-id="5445353829304387411">🎯</tg-emoji> <b>መቀበያዎ፦</b> <code>${order.accountOrWallet}</code> (${order.bankOrNetwork})\n\n` +
    `<tg-emoji emoji-id="5373141891321699086">👉</tg-emoji> <b>እባክዎ ትክክለኛውን ብር ከታች ባሉት አማራጮች ገቢ ያድርጉ፡-</b>\n\n` +
    `<tg-emoji emoji-id="5960632377339285724">📱</tg-emoji> <b>Telebirr፦</b> <code>0962963500</code>\n` +
    `<tg-emoji emoji-id="5373012449597335010">👤</tg-emoji> <b>ስም፦</b> <b>Asegidew</b>\n\n` +
    `<tg-emoji emoji-id="5961054379350955385">🏦</tg-emoji> <b>CBE ንግድ ባንክ፦</b> <code>1000764146453</code>\n` +
    `<tg-emoji emoji-id="5373012449597335010">👤</tg-emoji> <b>ስም፦</b> <b>Rediet Mulugeta</b>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<tg-emoji emoji-id="5253742260054409879">📸</tg-emoji> <b>ክፍያውን እንደፈጸሙ የከፈሉበትን ደረሰኝ (Screenshot) ከስር ይላኩ፡-</b>`;

  try {
    await ctx.telegram.sendMessage(order.telegramId, payAccounts, { parse_mode: 'HTML', ...cancelKeyboard });
  } catch (e) {
    console.error('Error notifying user:', e.message);
  }

  await ctx.editMessageText(
    ctx.callbackQuery.message.text + `\n\n<b><tg-emoji emoji-id="5413366476251866707">✅</tg-emoji> ተፈቅዷል፤ የባንክ መረጃ ተልኮለታል!</b>`,
    { parse_mode: 'HTML' }
  );
});

bot.action(/deny_buy_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const order = await Order.findOne({ orderId });

  if (!order) return ctx.reply('⚠️ ትዕዛዙ አልተገኘም!');

  order.status = '❌ በ Admin ውድቅ ተደርጓል';
  await order.save();

  await User.findOneAndUpdate(
    { telegramId: order.telegramId },
    { step: 'none', tempOrder: {} }
  );

  try {
    await ctx.telegram.sendMessage(
      order.telegramId,
      `<tg-emoji emoji-id="5434095036394387314">🚫</tg-emoji> <b>ይቅርታ፣ የ USDT ግዢ ጥያቄዎ በአድሚን ውድቅ ተደርጓል!</b>\n\n💬 ለተጨማሪ መረጃ @VT_On ያነጋግሩ።`,
      { parse_mode: 'HTML', ...mainKeyboard }
    );
  } catch (e) {}

  await ctx.editMessageText(
    ctx.callbackQuery.message.text + `\n\n<b><tg-emoji emoji-id="5240241223632954241">❌</tg-emoji> ውድቅ ተደርጓል (ደንበኛው ተሰርዟል)!</b>`,
    { parse_mode: 'HTML' }
  );
});

// ==================== 📸 SCREENSHOT መላኪያ ክፍል ====================
async function handleUserScreenshot(ctx, fileId) {
  const isJoined = await checkChannelJoined(ctx, ctx.from.id);
  if (!isJoined) return sendJoinPrompt(ctx);

  const user = await getUser(ctx.from.id, ctx);
  const temp = user.tempOrder || {};

  let order;
  if (temp.orderType === 'buy' && temp.currentOrderId) {
    order = await Order.findOne({ orderId: temp.currentOrderId });
    if (order) {
      order.userProofPhotoId = fileId;
      order.status = '⏳ በመጠባበቅ ላይ (ደረሰኝ ደርሷል)';
      await order.save();
    }
  }

  if (!order) {
    const orderId = 'ORD-' + Date.now();
    order = await Order.create({
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
      status: '⏳ በመጠባበቅ ላይ (ደረሰኝ ደርሷል)'
    });
  }

  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { step: 'none', tempOrder: {} });

  const userReplyMsg = 
    `<tg-emoji emoji-id="5201691993775818138">✅</tg-emoji> <b>ትዕዛዝዎ እና የከፈሉበት ደረሰኝ በተሳካ ሁኔታ ደርሶናል!</b>\n\n` +
    `<tg-emoji emoji-id="5971889748615105853">👨‍💻</tg-emoji> <b>መረጃዎ ወደ Admin ተልኳል፤ በጥቂት ደቂቃዎች ውስጥ ተጣርቶ ይላክሎታል።</b>\n\n` +
    `<tg-emoji emoji-id="5341498088408234504">🙏</tg-emoji> <b>ቪቫ ፒ ቱ ፒ (Viva P2P Exchange) ን ስለመረጡ እናመሰግናለን!</b>`;

  await ctx.reply(userReplyMsg, { parse_mode: 'HTML', ...mainKeyboard });

  let adminCaption = '';
  if (order.orderType === 'buy') {
    adminCaption = 
      `<tg-emoji emoji-id="5429651785352501917">🟢</tg-emoji> <b>የተፈቀደው የUSDT ግዢ ደረሰኝ ደርሷል!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<tg-emoji emoji-id="5373012449597335010">🆔</tg-emoji> <b>የትዕዛዝ ቁጥር፦</b> <code>${order.orderId}</code>\n` +
      `<tg-emoji emoji-id="6267229004311303657">👤</tg-emoji> <b>ደንበኛ፦</b> @${order.username || 'የለውም'} (${order.firstName})\n` +
      `<tg-emoji emoji-id="6019297120886987085">🆔</tg-emoji> <b>Telegram ID፦</b> <code>${order.telegramId}</code>\n` +
      `<tg-emoji emoji-id="5965043124068687455">💵</tg-emoji> <b>የተገዛው መጠን፦</b> <b>${order.amount} USDT</b>\n` +
      `<tg-emoji emoji-id="6267068789146260253">💰</tg-emoji> <b>የከፈለው ብር፦</b> <b>${order.totalEtb} ETB</b>\n` +
      `<tg-emoji emoji-id="6267115986541877538">🔗</tg-emoji> <b>ኔትወርክ፦</b> ${order.bankOrNetwork}\n` +
      `<tg-emoji emoji-id="5397782960512444700">🎯</tg-emoji> <b>የደንበኛው ዋሌት/ID፦</b> <code>${order.accountOrWallet}</code>\n\n` +
      `👇 <b>ብር መግባቱን ካረጋገጡና USDT ከላኩ በኋላ አጽድቁ፡-</b>`;
  } else {
    adminCaption = 
      `<tg-emoji emoji-id="5429518319243775957">🚨</tg-emoji> <b>አዲስ የUSDT ሽያጭ (Sell) ደረሰኝ ደርሷል!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<tg-emoji emoji-id="5373012449597335010">🆔</tg-emoji> <b>የትዕዛዝ ቁጥር፦</b> <code>${order.orderId}</code>\n` +
      `<tg-emoji emoji-id="6267229004311303657">👤</tg-emoji> <b>ደንበኛ፦</b> @${order.username || 'የለውም'} (${order.firstName})\n` +
      `<tg-emoji emoji-id="6019297120886987085">🆔</tg-emoji> <b>Telegram ID፦</b> <code>${order.telegramId}</code>\n` +
      `<tg-emoji emoji-id="5445353829304387411">🏦</tg-emoji> <b>ባንክ፦</b> <b>${order.bankOrNetwork}</b>\n` +
      `<tg-emoji emoji-id="5445353829304387411">👤</tg-emoji> <b>የአካውንት ስም፦</b> <b>${order.accountName}</b>\n` +
      `<tg-emoji emoji-id="5406809207947142040">📱</tg-emoji> <b>የደንበኛው አካውንት/ስልክ፦</b> <code>${order.accountOrWallet}</code>\n` +
      `<tg-emoji emoji-id="5965043124068687455">💵</tg-emoji> <b>የሚሸጠው መጠን፦</b> <b>${order.amount} USDT</b>\n` +
      `<tg-emoji emoji-id="5370947515220761242">💰</tg-emoji> <b>እርስዎ የሚልኩለት ብር፦</b> <b>${order.totalEtb} ETB</b>\n\n` +
      `👇 <b>ክፍያው ትክክል ከሆነ ያጽድቁ፡-</b>`;
  }

  const adminButtons = Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ አጽድቅ (Approve)', `approve_order_${order.orderId}`),
      Markup.button.callback('❌ ውድቅ አድርግ (Reject)', `reject_order_${order.orderId}`)
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

// ==================== 👨‍💻 FINAL APPROVAL ACTIONS ====================
bot.action(/approve_order_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const order = await Order.findOne({ orderId });

  if (!order) {
    return ctx.reply('<tg-emoji emoji-id="5447644880824181073">⚠️</tg-emoji> ይህ ትዕዛዝ አልተገኘም!', { parse_mode: 'HTML' });
  }

  order.status = '✅ ተጠናቋል (Completed)';
  await order.save();

  let clientSuccessMsg = '';
  if (order.orderType === 'sell') {
    clientSuccessMsg = 
      `<tg-emoji emoji-id="6266973397922616654">🏆</tg-emoji> <b>ትዕዛዝዎ በ Admin ጸድቋል!</b> <tg-emoji emoji-id="6267118537752450044">✅</tg-emoji>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<tg-emoji emoji-id="5201691993775818138">💸</tg-emoji> <b>ያዘዙት የ ${order.totalEtb} ETB ክፍያ ወደ ሂሳብዎ ገቢ ተደርጓል።</b>\n\n` +
      `<tg-emoji emoji-id="5406809207947142040">📱</tg-emoji> <b>የተላከበት ሂሳብ፦</b> <code>${order.accountOrWallet}</code>\n\n` +
      `<tg-emoji emoji-id="5341498088408234504">🌟</tg-emoji> <b>Viva P2P Exchange ን ስለመረጡ እናመሰግናለን!</b> <tg-emoji emoji-id="5217614738917173774">🙏</tg-emoji>`;
  } else {
    clientSuccessMsg = 
      `<tg-emoji emoji-id="6266973397922616654">🏆</tg-emoji> <b>ትዕዛዝዎ በ Admin ጸድቋል!</b> <tg-emoji emoji-id="6267118537752450044">✅</tg-emoji>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<tg-emoji emoji-id="5190806721286657692">💎</tg-emoji> <b>ያዘዙት ${order.amount} USDT ወደ Wallet/ID አድራሻዎ በተሳካ ሁኔታ ተልኳል!</b>\n\n` +
      `<tg-emoji emoji-id="5397782960512444700">🎯</tg-emoji> <b>የተላከበት አድራሻ፦</b> <code>${order.accountOrWallet}</code>\n\n` +
      `<tg-emoji emoji-id="6266995104687330978">🌟</tg-emoji> <b>ቪቫ ፒ ቱ ፒ (Viva P2P Exchange) ን ስለመረጡ እናመሰግናለን!</b> <tg-emoji emoji-id="5217614738917173774">🙏</tg-emoji>`;
  }

  try {
    await ctx.telegram.sendMessage(order.telegramId, clientSuccessMsg, { parse_mode: 'HTML', ...mainKeyboard });
  } catch (err) {
    console.error('Error sending message to client:', err.message);
  }

  await ctx.editMessageCaption(
    ctx.callbackQuery.message.caption + `\n\n<b><tg-emoji emoji-id="6267118537752450044">✅</tg-emoji> በ Admin ጸድቋል (APPROVED)!</b>`,
    { parse_mode: 'HTML' }
  );

  return ctx.reply(`<tg-emoji emoji-id="6267117038808870117">🎉</tg-emoji> ትዕዛዝ #${orderId} ጸድቋል፤ ለደንበኛው የማረጋገጫ መልእክት ደርሶታል!`, { parse_mode: 'HTML' });
});

bot.action(/reject_order_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const order = await Order.findOne({ orderId });

  if (!order) {
    return ctx.reply('<tg-emoji emoji-id="5447644880824181073">⚠️</tg-emoji> ይህ ትዕዛዝ አልተገኘም!', { parse_mode: 'HTML' });
  }

  order.status = '❌ ውድቅ ተደርጓል (Rejected)';
  await order.save();

  const clientRejectMsg = 
    `<tg-emoji emoji-id="5240241223632954241">🚫</tg-emoji> <b>ትዕዛዝዎ ውድቅ ተደርጓል!</b> <tg-emoji emoji-id="6267000941547885720">❌</tg-emoji>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `<tg-emoji emoji-id="5447644880824181073">⚠️</tg-emoji> <b>የላኩት የክፍያ ደረሰኝ (Screenshot) ትክክል ስላልሆነ በ Admin ውድቅ ተደርጓል።</b>\n\n` +
    `<tg-emoji emoji-id="6266764202950530136">💬</tg-emoji> <b>ለተጨማሪ መረጃ ወይም ቅሬታ ካለዎት Admin ያነጋግሩ፦</b> @VT_On`;

  try {
    await ctx.telegram.sendMessage(order.telegramId, clientRejectMsg, { parse_mode: 'HTML', ...mainKeyboard });
  } catch (err) {
    console.error('Error sending message to client:', err.message);
  }

  await ctx.editMessageCaption(
    ctx.callbackQuery.message.caption + `\n\n<b><tg-emoji emoji-id="6267000941547885720">❌</tg-emoji> በ Admin ውድቅ ተደርጓል (REJECTED)!</b>`,
    { parse_mode: 'HTML' }
  );

  return ctx.reply(`<tg-emoji emoji-id="6267000941547885720">❌</tg-emoji> ትዕዛዝ #${orderId} ውድቅ ተደርጓል፤ ለደንበኛው ማሳሰቢያ ተልኳል!`, { parse_mode: 'HTML' });
});

bot.launch().then(() => {
  console.log('Viva P2P Exchange Bot Active with All Features!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
