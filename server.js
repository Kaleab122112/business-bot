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

// የተጠቃሚዎች ሁኔታ መከታተያ (State)
const userSessions = {};

// የተመን ማስያ ፈንክሽን (Tiered Calculation)
function calculateRate(amount) {
  if (amount >= 0.5 && amount <= 0.99) {
    return 175;
  } else if (amount >= 1.0 && amount <= 15.0) {
    return 180;
  } else if (amount >= 16.0) {
    return 182;
  }
  return 0; // ከ 0.5 በታች ከሆነ
}

// ዋናው ሜኑ (Main Keyboard)
const mainMenu = Markup.keyboard([
  ['💵 USDT መግዛት', '💰 USDT መሸጥ'],
  ['📊 የዛሬ ተመን', '📜 የእኔ ትዕዛዞች'],
  ['📞 ድጋፍ / Support', 'ℹ️ ስለ አሰራሩ']
]).resize();

// /start ትዕዛዝ
bot.start(async (ctx) => {
  const user = ctx.from;
  delete userSessions[ctx.from.id];

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

// 💰 USDT መሸጥ ሲጫን የሚመጣው ገጽ (ያልከው ገጽ እዚህ ገብቷል)
bot.hears('💰 USDT መሸጥ', async (ctx) => {
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
    Markup.keyboard([
      ['✅ ተስማምቻለሁ'],
      ['🔻 ሰርዝ']
    ]).resize()
  );
});

// «✅ ተስማምቻለሁ» ሲጫን
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
    Markup.keyboard([['🔻 ሰርዝ']]).resize()
  );
});

// «🔻 ሰርዝ» ሲጫን
bot.hears('🔻 ሰርዝ', (ctx) => {
  delete userSessions[ctx.from.id];
  return ctx.replyWithHTML("❌ <b>ግብይቱ ተሰርዟል። ወደ ዋናው ሜኑ ተመልሰዋል።</b>", mainMenu);
});

// የቁጥር ግብዓት እና ስሌት መቀበያ
bot.on('text', async (ctx, next) => {
  const text = ctx.message.text.trim();
  const userId = ctx.from.id;
  const session = userSessions[userId];

  if (session && session.step === 'awaiting_amount') {
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

  return next();
});

// አረጋግጥ ሲጫን ወደ ዳታቤዝ ማስቀመጥ
bot.action('confirm_sell_order', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];

  if (!session || !session.amount) {
    return ctx.reply('የትዕዛዝ መረጃ አልተገኘም። እባክዎ እንደገና ይጀምሩ።');
  }

  const order = {
    user_id: userId,
    username: ctx.from.username,
    name: ctx.from.first_name,
    type: 'SELL',
    amount: session.amount,
    rate: session.rate,
    total_etb: session.totalEtb,
    status: 'Pending',
    created_at: new Date()
  };

  const res = await ordersCol.insertOne(order);
  delete userSessions[userId];

  await ctx.editMessageText(
    `✅ <b>ትዕዛዝዎ በተሳካ ሁኔታ ተመዝግቧል!</b>\n` +
    `የትዕዛዝ መለያ (ID)፦ <code>${res.insertedId}</code>\n\n` +
    `USDT የሚልኩበትን አድራሻ ለመቀበል እና ገንዘብዎን በባንክ/ቴሌብር ለመቀበል እባክዎ አድሚኑን ያነጋግሩ፦ @VivaSupport`,
    { parse_mode: 'HTML' }
  );

  return ctx.replyWithHTML("ወደ ዋናው ገጽ ለመመለስ ከታች ያለውን ይጠቀሙ፦", mainMenu);
});

bot.action('cancel_sell_order', async (ctx) => {
  delete userSessions[ctx.from.id];
  await ctx.editMessageText('❌ ትዕዛዙ ተሰርዟል።');
  return ctx.replyWithHTML("ወደ ዋናው ገጽ ተመልሰዋል፦", mainMenu);
});

// የዛሬ ተመን ማሳያ
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
  const orders = await ordersCol.find({ user_id: ctx.from.id }).sort({ _id: -1 }).limit(5).toArray();
  if (orders.length === 0) {
    return ctx.reply('እስካሁን ምንም አይነት ትዕዛዝ አላስገቡም።');
  }

  let text = '📜 <b>የቅርብ ጊዜ ትዕዛዞችዎ፦</b>\n\n';
  orders.forEach((o) => {
    text += `• ${o.type}: ${o.amount} USDT (${o.total_etb.toLocaleString()} ETB) — <i>${o.status}</i>\n`;
  });
  return ctx.replyWithHTML(text);
});

// ድጋፍ እና አሰራር
bot.hears('📞 ድጋፍ / Support', (ctx) => {
  return ctx.reply('ለማንኛውም እርዳታ አድሚናችንን ያነጋግሩ፦ @VivaSupport');
});

bot.hears('ℹ️ ስለ አሰራሩ', (ctx) => {
  return ctx.replyWithHTML(
    "ℹ️ <b>Viva P2P Exchange አሰራር፦</b>\n\n" +
    "1. የሚሸጡትን መጠን ያስገቡ።\n" +
    "2. ቦቱ በተመኑ መሰረት የሚቀበሉትን ትክክለኛ ብር ያሰላል።\n" +
    "3. ትዕዛዝ ሲያረጋግጡ USDT የሚልኩበት የዋሌት አድራሻ ይሰጥዎታል።\n" +
    "4. ክፍያው ሲረጋገጥ ብሩ በቴሌብር ወይም በባንክ ሂሳብዎ ይገባል!"
  );
});

bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log('Telegram P2P Bot started with tiered sell rates!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
