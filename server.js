const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Viva P2P Bot is Live and Healthy!');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_ID = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : 0;

// የክሪፕቶ መላኪያ አድራሻዎችህ (Environment Variables ወይም እዚሁ መተካት ትችላለህ)
const CRYPTO_WALLETS = {
  binance_id: process.env.BINANCE_PAY_ID || "123456789 (Binance Pay ID)",
  usdt_bep20: process.env.USDT_BEP20_WALLET || "0xYourBep20WalletAddress...",
  ltc: process.env.LTC_WALLET || "LtcYourAddressHere...",
  ton: process.env.TON_WALLET || "UQYourTonAddressHere..."
};

if (!BOT_TOKEN || !MONGO_URI) {
  console.error("Missing BOT_TOKEN or MONGO_URI!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const client = new MongoClient(MONGO_URI);

let db, usersCol, ordersCol;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('viva_p2p_db');
    usersCol = db.collection('users');
    ordersCol = db.collection('orders');
    console.log('MongoDB successfully connected!');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}
connectDB();

const userSessions = {};

function calculateRate(amount) {
  if (amount >= 0.5 && amount <= 0.99) return 175;
  if (amount >= 1.0 && amount <= 15.0) return 180;
  if (amount >= 16.0) return 182;
  return 0;
}

const mainMenu = Markup.keyboard([
  ['💵 USDT መግዛት', '💰 USDT መሸጥ'],
  ['📊 የዛሬ ተመን', '📜 የእኔ ትዕዛዞች'],
  ['📞 ድጋፍ / Support', 'ℹ️ ስለ አሰራሩ']
]).resize();

const cancelMenu = Markup.keyboard([['🔻 ሰርዝ']]).resize();

// /start
bot.start(async (ctx) => {
  const user = ctx.from;
  delete userSessions[user.id];

  try {
    if (usersCol) {
      await usersCol.updateOne(
        { user_id: user.id },
        { $set: { name: `${user.first_name || ''} ${user.last_name || ''}`.trim(), username: user.username } },
        { upsert: true }
      );
    }
  } catch (e) {
    console.error(e);
  }

  const welcomeText = 
    `👋 ሰላም ${user.first_name}!\n\n` +
    `ወደ <b>Viva P2P Exchange</b> በደህና መጡ።\n` +
    `ፈጣን እና አስተማማኝ የ P2P የምንዛሬ አገልግሎት።\n\n` +
    `ለመጀመር ከታች ካሉት ምርጫዎች አንዱን ይጫኑ፦`;

  return ctx.replyWithHTML(welcomeText, mainMenu);
});

// 1. USDT መሸጥ ገጽ
bot.hears('💰 USDT መሸጥ', (ctx) => {
  userSessions[ctx.from.id] = { step: 'awaiting_agreement', action: 'sell' };

  const sellPageMsg = 
    "💵 <b>የ USDT መሸጫ ገጽ (SELL USDT)</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "📊 <b>የዛሬ የመሸጫ ተመኖች (Rates)፦</b>\n\n" +
    "• 🔸 <b>ከ 0.5 – 0.99 USDT፦</b> <b>175 ETB</b>\n" +
    "• 🔹 <b>ከ 1.0 – 15.0 USDT፦</b> <b>180 ETB</b>\n" +
    "• 💎 <b>ከ 16.0 USDT በላይ፦</b> <b>182 ETB</b>\n\n" +
    "📌 <b>ዝቅተኛ የመሸጫ መጠን፦</b> <b>0.5 USDT</b>\n\n" +
    "<blockquote><b>✍️ የሚሸጡትን መጠን ሲያስገቡ ቦቱ በራሱ አባዝቶ የሚቀበሉትን ትክክለኛ ብር ያሳየዎታል።</b></blockquote>\n\n" +
    "👉 <b>ለመቀጠል «✅ ተስማምቻለሁ» የሚለውን ይጫኑ፡-</b>";

  return ctx.replyWithHTML(
    sellPageMsg,
    Markup.keyboard([['✅ ተስማምቻለሁ'], ['🔻 ሰርዝ']]).resize()
  );
});

// 2. ተስማምቻለሁ
bot.hears('✅ ተስማምቻለሁ', (ctx) => {
  const session = userSessions[ctx.from.id];
  if (!session || session.step !== 'awaiting_agreement') {
    return ctx.replyWithHTML('እባክዎ መጀመሪያ ከዋናው ሜኑ <b>💰 USDT መሸጥ</b> የሚለውን ይምረጡ።', mainMenu);
  }

  session.step = 'awaiting_amount';
  return ctx.replyWithHTML(
    "✍️ <b>እባክዎ የሚሸጡትን የ USDT መጠን ያስገቡ፦</b>\n\n" +
    "<i>(ለምሳሌ፦ 0.8፣ 5፣ ወይም 20)</i>\n" +
    "📌 <i>ዝቅተኛ መጠን 0.5 USDT ነው</i>",
    cancelMenu
  );
});

// 3. ሰርዝ
bot.hears('🔻 ሰርዝ', (ctx) => {
  delete userSessions[ctx.from.id];
  return ctx.replyWithHTML("❌ <b>ግብይቱ ተሰርዟል። ወደ ዋናው ሜኑ ተመልሰዋል።</b>", mainMenu);
});

// 4. አረጋግጥ እና ቀጥል ➔ የብር መቀበያ ባንክ መምረጫ
bot.action('confirm_sell_order', async (ctx) => {
  const session = userSessions[ctx.from.id];
  if (!session || !session.amount) {
    return ctx.reply('የትዕዛዝ መረጃ አልተገኘም። እባክዎ እንደገና ይጀምሩ።', mainMenu);
  }

  session.step = 'choosing_payout_method';
  await ctx.answerCbQuery();

  const payMsg = 
    "💳 <b>ገንዘብዎን በምን መቀበል ይፈልጋሉ?</b>\n\n" +
    "እባክዎ ብር የሚቀበሉበትን የሂሳብ አይነት ይምረጡ፦";

  return ctx.editMessageText(payMsg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('📱 Telebirr', 'payout_telebirr')],
      [Markup.button.callback('🏦 CBE (ንግድ ባንክ)', 'payout_cbe')],
      [Markup.button.callback('❌ ሰርዝ', 'cancel_sell_order')]
    ])
  });
});

// 5. Telebirr
bot.action('payout_telebirr', async (ctx) => {
  const session = userSessions[ctx.from.id];
  if (!session) return ctx.reply('እባክዎ እንደገና ይጀምሩ።', mainMenu);

  session.payout_method = 'Telebirr';
  session.step = 'awaiting_telebirr_phone';
  await ctx.answerCbQuery();

  await ctx.editMessageText(
    "📱 <b>የቴሌብር (Telebirr) መረጃ</b>\n━━━━━━━━━━━━━━━━━━━━\n\n" +
    "እባክዎ የቴሌብር <b>ስልክ ቁጥርዎን</b> ያስገቡ፦\n\n" +
    "📌 <i>ስልክ ቁጥሩ በትክክል 10 ዲጂት መሆን አለበት (ምሳሌ፦ <code>0912345678</code> ወይም <code>0712345678</code>)</i>",
    { parse_mode: 'HTML' }
  );
  return ctx.reply("ስልክ ቁጥርዎን ይጻፉ፦", cancelMenu);
});

// 6. CBE
bot.action('payout_cbe', async (ctx) => {
  const session = userSessions[ctx.from.id];
  if (!session) return ctx.reply('እባክዎ እንደገና ይጀምሩ።', mainMenu);

  session.payout_method = 'CBE';
  session.step = 'awaiting_cbe_account';
  await ctx.answerCbQuery();

  await ctx.editMessageText(
    "🏦 <b>የኢትዮጵያ ንግድ ባንክ (CBE) መረጃ</b>\n━━━━━━━━━━━━━━━━━━━━\n\n" +
    "እባክዎ የ CBE <b>የባንክ ሂሳብ ቁጥርዎን (Account Number)</b> ያስገቡ፦\n\n" +
    "📌 <i>የሂሳብ ቁጥሩ ቢያንስ 13 ዲጂት መሆን አለበት (ምሳሌ፦ <code>1000123456789</code>)</i>",
    { parse_mode: 'HTML' }
  );
  return ctx.reply("የባንክ ሂሳብ ቁጥርዎን ይጻፉ፦", cancelMenu);
});

// 7. የክሪፕቶ መላኪያ ዘዴ መምረጫ (Crypto Transfer Network Selection)
bot.action(/crypto_(.+)/, async (ctx) => {
  const session = userSessions[ctx.from.id];
  if (!session) return ctx.reply('እባክዎ እንደገና ይጀምሩ።', mainMenu);

  const selectedCrypto = ctx.match[1];
  session.crypto_method_key = selectedCrypto;
  session.step = 'awaiting_screenshot';
  await ctx.answerCbQuery();

  let cryptoTitle = "";
  let walletAddress = "";

  switch (selectedCrypto) {
    case 'binance_id':
      cryptoTitle = "🟡 Binance Pay ID";
      walletAddress = CRYPTO_WALLETS.binance_id;
      break;
    case 'usdt_bep20':
      cryptoTitle = "🟢 USDT (BEP-20 / BNB Smart Chain)";
      walletAddress = CRYPTO_WALLETS.usdt_bep20;
      break;
    case 'ltc':
      cryptoTitle = "⚪ Litecoin (LTC)";
      walletAddress = CRYPTO_WALLETS.ltc;
      break;
    case 'ton':
      cryptoTitle = "💎 TON (The Open Network)";
      walletAddress = CRYPTO_WALLETS.ton;
      break;
  }

  session.crypto_method = cryptoTitle;
  session.wallet_given = walletAddress;

  const promptTransferMsg = 
    `📤 <b>ክፍያ መላኪያ አድራሻ (${cryptoTitle})</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🔹 <b>የሚልኩት መጠን፦</b> <code>${session.amount} USDT</code>\n` +
    `🔹 <b>የተመረጠው መንገድ፦</b> <b>${cryptoTitle}</b>\n\n` +
    `🔹 <b>ተቀባይ አድራሻ (ለመገልበጥ አንዴ ይንኩት)፦</b>\n` +
    `<code>${walletAddress}</code>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>ቀጣይ እርምጃ፦</b>\n` +
    `1. ከላይ ወዳለው አድራሻ ልክ <b>${session.amount} USDT</b> ይላኩ።\n` +
    `2. ልከው እንደጨረሱ <b>የከፈሉበትን ደረሰኝ (Screenshot)</b> እዚህ ቻት ላይ ይላኩ።\n\n` +
    `📸 <i>እባክዎ Screenshot አሁን ይላኩ...</i>`;

  await ctx.editMessageText(promptTransferMsg, { parse_mode: 'HTML' });
  return ctx.reply("የደረሰኙን ፎቶ ይጠብቃል...", cancelMenu);
});

bot.action('cancel_sell_order', async (ctx) => {
  delete userSessions[ctx.from.id];
  await ctx.answerCbQuery();
  await ctx.editMessageText('❌ ትዕዛዙ ተሰርዟል።');
  return ctx.replyWithHTML("ወደ ዋናው ገጽ ተመልሰዋል፦", mainMenu);
});

// 8. የጽሁፍ መልእክቶችን መቀበያ
bot.on('text', async (ctx, next) => {
  const text = ctx.message.text.trim();
  const userId = ctx.from.id;
  const session = userSessions[userId];

  if (!session) return next();

  // የ USDT መጠን መቀበያ
  if (session.step === 'awaiting_amount') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount < 0.5) {
      return ctx.replyWithHTML("⚠️ <b>ስህተት፦</b> እባክዎ ከ <b>0.5 USDT</b> ጀምሮ ትክክለኛ ቁጥር ያስገቡ።");
    }

    const rate = calculateRate(amount);
    const totalEtb = amount * rate;

    session.amount = amount;
    session.rate = rate;
    session.totalEtb = totalEtb;
    session.step = 'awaiting_confirm';

    const summaryMsg = 
      "📝 <b>የትዕዛዝዎ ማጠቃለያ (Order Summary)</b>\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
      `🔹 <b>የ USDT መጠን፦</b> <code>${amount} USDT</code>\n` +
      `🔹 <b>የተሰላበት ተመን፦</b> <code>${rate} ETB</code>\n` +
      `💵 <b>የሚቀበሉት ጠቅላላ ብር፦</b> <code>${totalEtb.toLocaleString()} ETB</code>\n\n` +
      "ትዕዛዝዎን ለማረጋገጥ ከታች ያለውን ይጫኑ፦";

    return ctx.replyWithHTML(
      summaryMsg,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ አረጋግጥ እና ቀጥል', 'confirm_sell_order')],
        [Markup.button.callback('❌ ሰርዝ', 'cancel_sell_order')]
      ])
    );
  }

  // የቴሌብር ስልክ ቁጥር
  if (session.step === 'awaiting_telebirr_phone') {
    const cleanPhone = text.replace(/[\s-]/g, '');
    const phoneRegex = /^(09|07)\d{8}$/;

    if (!phoneRegex.test(cleanPhone) || cleanPhone.length !== 10) {
      return ctx.replyWithHTML(
        "⚠️ <b>ልክ ያልሆነ የስልክ ቁጥር!</b>\n\n" +
        "እባክዎ በ <b>09</b> ወይም <b>07</b> የሚጀምር <b>10 ዲጂት</b> የቴሌብር ስልክ ቁጥር ያስገቡ።\n" +
        "<i>ምሳሌ፦ 0912345678</i>"
      );
    }

    session.account_number = cleanPhone;
    session.step = 'awaiting_account_name';
    return ctx.replyWithHTML("👤 እባክዎ የቴሌብር አካውንቱን <b>ሙሉ ስም</b> ያስገቡ፦");
  }

  // የ CBE አካውንት ቁጥር
  if (session.step === 'awaiting_cbe_account') {
    const cleanAcc = text.replace(/[\s-]/g, '');
    const accRegex = /^\d{13,}$/;

    if (!accRegex.test(cleanAcc)) {
      return ctx.replyWithHTML(
        "⚠️ <b>ልክ ያልሆነ የባንክ ሂሳብ ቁጥር!</b>\n\n" +
        "የ CBE ሂሳብ ቁጥር <b>ቢያንስ 13 ዲጂት ቁጥር</b> መሆን አለበት።\n" +
        "<i>ምሳሌ፦ 1000123456789</i>"
      );
    }

    session.account_number = cleanAcc;
    session.step = 'awaiting_account_name';
    return ctx.replyWithHTML("👤 እባክዎ የባንክ አካውንቱን <b>ሙሉ ስም</b> ያስገቡ፦");
  }

  // ስም መቀበል ➔ ክሪፕቶውን በምን እንደሚልክ ምርጫ ማቅረብ
  if (session.step === 'awaiting_account_name') {
    if (text.length < 3) {
      return ctx.reply("እባክዎ ትክክለኛ ሙሉ ስም ያስገቡ፦");
    }

    session.account_name = text;
    session.step = 'choosing_crypto_deposit_method';

    const askCryptoMsg = 
      "🌐 <b>ክሪፕቶውን/USDT በምን መላክ ይፈልጋሉ?</b>\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
      "እባክዎ የሚልኩበትን የክፍያ ወይም የኔትወርክ አይነት ይምረጡ፦";

    return ctx.replyWithHTML(
      askCryptoMsg,
      Markup.inlineKeyboard([
        [Markup.button.callback('🟡 Binance Pay ID', 'crypto_binance_id')],
        [Markup.button.callback('🟢 USDT (BEP-20)', 'crypto_usdt_bep20')],
        [Markup.button.callback('⚪ Litecoin (LTC)', 'crypto_ltc')],
        [Markup.button.callback('💎 TON', 'crypto_ton')],
        [Markup.button.callback('🔻 ሰርዝ', 'cancel_sell_order')]
      ])
    );
  }

  return next();
});

// 9. Screenshot (ፎቶ) መቀበል እና ወደ Admin ማስተላለፍ
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];

  if (!session || session.step !== 'awaiting_screenshot') {
    return ctx.reply("እባክዎ መጀመሪያ ከሜኑ ውስጥ ትዕዛዝ ያስጀምሩ።", mainMenu);
  }

  const photos = ctx.message.photo;
  const fileId = photos[photos.length - 1].file_id;

  let orderId = "N/A";
  try {
    const orderDoc = {
      user_id: userId,
      username: ctx.from.username || "የለውም",
      name: `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim(),
      type: 'SELL',
      amount: session.amount,
      rate: session.rate,
      total_etb: session.totalEtb,
      payout_method: session.payout_method,
      account_number: session.account_number,
      account_name: session.account_name,
      crypto_method: session.crypto_method,
      screenshot_file_id: fileId,
      status: 'Pending',
      created_at: new Date()
    };
    const res = await ordersCol.insertOne(orderDoc);
    orderId = res.insertedId.toString();
  } catch (err) {
    console.error("MongoDB order insert error:", err);
  }

  // ለተጠቃሚው ማረጋገጫ
  await ctx.replyWithHTML(
    `✅ <b>የከፈሉበት ደረሰኝ በተሳካ ሁኔታ ደርሶናል!</b>\n\n` +
    `🆔 <b>የትዕዛዝ መለያ፦</b> <code>${orderId}</code>\n` +
    `🌐 <b>የላኩበት መንገድ፦</b> <b>${session.crypto_method}</b>\n` +
    `💳 <b>ብር የሚቀበሉበት፦</b> <b>${session.payout_method}</b>\n` +
    `💰 <b>የሚቀበሉት ብር፦</b> <b>${session.totalEtb.toLocaleString()} ETB</b>\n\n` +
    `<blockquote>ደረሰኙ በአድሚን ተረጋግጦ በደቂቃዎች ውስጥ ወደ <b>${session.account_number} (${session.account_name})</b> ይተላለፋል።</blockquote>`,
    mainMenu
  );

  // ለአድሚን በፎቶ እና ሙሉ ዝርዝር መላክ
  if (ADMIN_ID !== 0) {
    const adminCaption = 
      `🚨 <b>አዲስ የ P2P ሽያጭ ትዕዛዝ ገብቷል!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>Order ID:</b> <code>${orderId}</code>\n` +
      `👤 <b>ተጠቃሚ:</b> @${ctx.from.username || 'username_የለውም'}\n` +
      `📝 <b>የቴሌግራም ስም:</b> ${ctx.from.first_name || ''}\n` +
      `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n\n` +
      `💵 <b>የተሸጠው መጠን:</b> <code>${session.amount} USDT</code>\n` +
      `📊 <b>ተመን:</b> <code>${session.rate} ETB</code>\n` +
      `💰 <b>የሚላክለት ብር:</b> <code>${session.totalEtb.toLocaleString()} ETB</code>\n\n` +
      `🌐 <b>ክሪፕቶ የላከበት መንገድ:</b> <b>${session.crypto_method}</b>\n` +
      `💳 <b>ብር መቀበያ ባንክ:</b> <b>${session.payout_method}</b>\n` +
      `🔢 <b>ስልክ / Account:</b> <code>${session.account_number}</code>\n` +
      `🏷 <b>የሂሳብ ባለቤት ስም:</b> <b>${session.account_name}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 <i>ከላይ የተላከውን የክፍያ Screenshot አረጋግጠው ብሩን ይላኩለት።</i>`;

    try {
      await ctx.telegram.sendPhoto(ADMIN_ID, fileId, {
        caption: adminCaption,
        parse_mode: 'HTML'
      });
    } catch (e) {
      console.error("Admin notify photo error:", e);
    }
  }

  delete userSessions[userId];
});

// የዛሬ ተመን
bot.hears('📊 የዛሬ ተመን', (ctx) => {
  const msg = 
    "📊 <b>የዛሬው Viva P2P የመሸጫ ተመኖች፦</b>\n\n" +
    "• 🔸 0.5 – 0.99 USDT ➔ <b>175 ETB</b>\n" +
    "• 🔹 1.0 – 15.0 USDT ➔ <b>180 ETB</b>\n" +
    "• 💎 16.0 USDT በላይ ➔ <b>182 ETB</b>\n";
  return ctx.replyWithHTML(msg);
});

// የእኔ ትዕዛዞች
bot.hears('📜 የእኔ ትዕዛዞች', async (ctx) => {
  try {
    const orders = await ordersCol.find({ user_id: ctx.from.id }).sort({ _id: -1 }).limit(5).toArray();
    if (!orders || orders.length === 0) {
      return ctx.reply('እስካሁን ምንም አይነት ትዕዛዝ አላስገቡም።');
    }

    let text = '📜 <b>የቅርብ ጊዜ ትዕዛዞችዎ፦</b>\n\n';
    orders.forEach((o) => {
      text += `• ${o.type}: ${o.amount} USDT (${o.total_etb.toLocaleString()} ETB) — [${o.payout_method || 'N/A'}] — <i>${o.status}</i>\n`;
    });
    return ctx.replyWithHTML(text);
  } catch (err) {
    return ctx.reply('መረጃዎችን ማምጣት አልተቻለም።');
  }
});

bot.hears('📞 ድጋፍ / Support', (ctx) => {
  return ctx.reply('ለማንኛውም እርዳታ አድሚናችንን ያነጋግሩ፦ @VivaSupport');
});

bot.hears('ℹ️ ስለ አሰራሩ', (ctx) => {
  return ctx.replyWithHTML(
    "ℹ️ <b>Viva P2P Exchange አሰራር፦</b>\n\n" +
    "1. የሚሸጡትን መጠን ያስገቡ።\n" +
    "2. ብር የሚቀበሉበትን (Telebirr ወይም CBE) ይምረጡ።\n" +
    "3. ቁጥር እና ሙሉ ስምዎን ያስገቡ።\n" +
    "4. ክሪፕቶ የሚልኩበትን (Binance ID, BEP-20, LTC, TON) ይምረጡ።\n" +
    "5. በተሰጠው አድራሻ ልከው Screenshot ሲልኩ ብሩ ወዲያውኑ ይገባልዎታል!"
  );
});

bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log('Viva P2P Bot updated with Crypto options!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
