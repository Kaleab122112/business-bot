const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 8080;

// Render Web Service ሁልጊዜ ነቅቶ እንዲሰራ የሚያደርግ Dummy Route
app.get('/', (req, res) => {
  res.send('Viva P2P Bot is Live and Healthy!');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Secrets
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;

if (!BOT_TOKEN || !MONGO_URI) {
  console.error("Missing BOT_TOKEN or MONGO_URI!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const client = new MongoClient(MONGO_URI);

let db, usersCol, ordersCol, settingsCol;

// MongoDB ማገናኘት
async function connectDB() {
  try {
    await client.connect();
    db = client.db('viva_p2p_db');
    usersCol = db.collection('users');
    ordersCol = db.collection('orders');
    settingsCol = db.collection('settings');
    console.log('MongoDB successfully connected!');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}
connectDB();

// ተመን ማምጣት
async function getRates() {
  let rates = await settingsCol.findOne({ type: 'rates' });
  if (!rates) {
    rates = { type: 'rates', buy_rate: 125.0, sell_rate: 128.0 };
    await settingsCol.insertOne(rates);
  }
  return rates;
}

// ጊዜያዊ የትዕዛዝ መረጃ ማስቀመጫ
const userSessions = {};

// /start ትዕዛዝ
bot.start(async (ctx) => {
  const user = ctx.from;
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
    `ወደ **Viva P2P Exchange** በደህና መጡ።\n` +
    `ፈጣን እና አስተማማኝ የ P2P የምንዛሬ አገልግሎት።\n\n` +
    `ለመጀመር ከታች ካሉት ምርጫዎች አንዱን ይጫኑ፦`;

  return ctx.replyWithMarkdown(
    welcomeText,
    Markup.keyboard([
      ['💵 USDT መግዛት', '💰 USDT መሸጥ'],
      ['📊 የዛሬ ተመን', '📜 የእኔ ትዕዛዞች'],
      ['📞 ድጋፍ / Support', 'ℹ️ ስለ አሰራሩ']
    ]).resize()
  );
});

// የዛሬ ተመን
bot.hears('📊 የዛሬ ተመን', async (ctx) => {
  const rates = await getRates();
  const msg = 
    `📊 *የዛሬው Viva P2P የምንዛሬ ተመን*\n\n` +
    `🔹 እኛ የምንገዛበት (Buy): *${rates.buy_rate} ETB*\n` +
    `🔸 እኛ የምንሸጥበት (Sell): *${rates.sell_rate} ETB*\n\n` +
    `⚠️ _ተመኑ እንደ ገበያው ሁኔታ በማንኛውም ጊዜ ሊለወጥ ይችላል።_`;
  ctx.replyWithMarkdown(msg);
});

// USDT መግዛት
bot.hears('💵 USDT መግዛት', async (ctx) => {
  const rates = await getRates();
  userSessions[ctx.from.id] = { action: 'buy' };
  ctx.replyWithMarkdown(
    `🛒 *USDT መግዛት ይፈልጋሉ*\n\n` +
    `የመሸጫ ተመን፡ *${rates.sell_rate} ETB*\n\n` +
    `እባክዎ የሚፈልጉትን የ USDT መጠን በቁጥር ብቻ ይጻፉ (ለምሳሌ: \`50\` ወይም \`100\`)፦`
  );
});

// USDT መሸጥ
bot.hears('💰 USDT መሸጥ', async (ctx) => {
  const rates = await getRates();
  userSessions[ctx.from.id] = { action: 'sell' };
  ctx.replyWithMarkdown(
    `💼 *USDT መሸጥ ይፈልጋሉ*\n\n` +
    `የመግዣ ተመን፡ *${rates.buy_rate} ETB*\n\n` +
    `እባክዎ የሚሸጡትን የ USDT መጠን በቁጥር ብቻ ይጻፉ (ለምሳሌ: \`50\` ወይም \`100\`)፦`
  );
});

// የተጠቃሚው የቁጥር ግብዓት መቀበያ
bot.on('text', async (ctx, next) => {
  const text = ctx.message.text;
  const userId = ctx.from.id;
  const session = userSessions[userId];

  if (session && !isNaN(text) && Number(text) > 0) {
    const amount = parseFloat(text);
    const rates = await getRates();
    const rate = session.action === 'buy' ? rates.sell_rate : rates.buy_rate;
    const totalEtb = amount * rate;

    session.amount = amount;
    session.totalEtb = totalEtb;
    session.rate = rate;

    const actionTitle = session.action === 'buy' ? 'መግዛት' : 'መሸጥ';

    return ctx.replyWithMarkdown(
      `📝 *የትዕዛዝ ዝርዝር (${actionTitle})*\n\n` +
      `🔹 የ USDT መጠን: *${amount} USDT*\n` +
      `🔹 ተመን: *${rate} ETB*\n` +
      `💵 ጠቅላላ ክፍያ: *${totalEtb.toLocaleString()} ETB*\n\n` +
      `ትዕዛዝዎን ለማረጋገጥ ከታች ያለውን ይጫኑ፦`,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ ትዕዛዝ አረጋግጥ', 'confirm_order')],
        [Markup.button.callback('❌ ሰርዝ', 'cancel_order')]
      ])
    );
  }
  return next();
});

// የማረጋገጫ ቁልፎች
bot.action('confirm_order', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];

  if (!session || !session.amount) {
    return ctx.reply('የትዕዛዝ መረጃ አልተገኘም። እባክዎ እንደገና ይሞክሩ።');
  }

  const order = {
    user_id: userId,
    username: ctx.from.username,
    name: ctx.from.first_name,
    type: session.action,
    amount: session.amount,
    rate: session.rate,
    total_etb: session.totalEtb,
    status: 'Pending',
    created_at: new Date()
  };

  const res = await ordersCol.insertOne(order);
  delete userSessions[userId];

  await ctx.editMessageText(
    `✅ *ትዕዛዝዎ በተሳካ ሁኔታ ተመዝግቧል!*\n` +
    `የትዕዛዝ ቁጥር: \`${res.insertedId}\`\n\n` +
    `እባክዎ ክፍያ ለመፈጸም እና የክፍያ ደረሰኝ (Screenshot) ለመላክ አድሚናችንን ያነጋግሩ፦ @VivaSupport`,
    { parse_mode: 'Markdown' }
  );
});

bot.action('cancel_order', async (ctx) => {
  delete userSessions[ctx.from.id];
  await ctx.editMessageText('❌ ትዕዛዙ ተሰርዟል።');
});

// የእኔ ትዕዛዞች
bot.hears('📜 የእኔ ትዕዛዞች', async (ctx) => {
  const orders = await ordersCol.find({ user_id: ctx.from.id }).sort({ _id: -1 }).limit(5).toArray();
  if (orders.length === 0) {
    return ctx.reply('እስካሁን ያስገቡት ምንም አይነት ትዕዛዝ የለም።');
  }

  let text = '📜 *የቅርብ ጊዜ ትዕዛዞችዎ፦*\n\n';
  orders.forEach((o) => {
    text += `• ${o.type.toUpperCase()}: ${o.amount} USDT (${o.total_etb.toLocaleString()} ETB) - _${o.status}_\n`;
  });
  ctx.replyWithMarkdown(text);
});

// ድጋፍ እና አሰራር
bot.hears('📞 ድጋፍ / Support', (ctx) => {
  ctx.reply('ለማንኛውም ጥያቄ አድሚናችንን ያነጋግሩ፦ @VivaSupport');
});

bot.hears('ℹ️ ስለ አሰራሩ', (ctx) => {
  ctx.replyWithMarkdown(
    `ℹ️ *Viva P2P Exchange አሰራር*\n\n` +
    `1. የሚገዙትን ወይም የሚሸጡትን መጠን ያስገቡ።\n` +
    `2. የተሰጠውን የባንክ ሂሳብ በመጠቀም ክፍያ ይፈጽሙ።\n` +
    `3. የከፈሉበትን ደረሰኝ ለአድሚን ይላኩ።\n` +
    `4. ክፍያው ሲረጋገጥ በደቂቃዎች ውስጥ ወደ ዋሌትዎ ይላካል!`
  );
});

// ቦቱን ማስጀመር
bot.launch({
  dropPendingUpdates: true
}).then(() => {
  console.log('Telegram P2P Bot started successfully!');
});

// መተግበሪያው ሲቆም በሰላም እንዲዘጋ
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
