require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const { User, Order } = require('./models');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = parseInt(process.env.ADMIN_ID || '8792715170');
const MAIN_CHANNEL = process.env.MAIN_CHANNEL || '@vivaonlinetech';
const PROOF_CHANNEL = process.env.PROOF_CHANNEL || '@Viva_online_proof';

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

function maskAccount(str) {
  if (!str) return '-';
  const clean = str.toString().trim();
  if (clean.length <= 4) return '****';
  const start = clean.slice(0, 4);
  const end = clean.slice(-2);
  return `${start}*****${end}`;
}

const mainKeyboard = Markup.keyboard([
  ['🔴 USDT ለመሸጥ', '🟢 USDT ለመግዛት'],
  ['📊 የዛሬ ዋጋ', '📋 ትዕዛዞቼ'],
  ['❓ ድጋፍ']
]).resize();

const cancelKeyboard = Markup.keyboard([
  ['🔻 ሰርዝ']
]).resize();

const backKeyboard = Markup.keyboard([
  ['🔙 ወደ ዋናው ሜኑ ተመለስ']
]).resize();

async function isUserMember(ctx, userId) {
  try {
    const member = await ctx.telegram.getChatMember(MAIN_CHANNEL, userId);
    return ['creator', 'administrator', 'member'].includes(member.status);
  } catch (err) {
    console.error('Channel check error:', err);
    return false;
  }
}

bot.start(async (ctx) => {
  const isMember = await isUserMember(ctx, ctx.from.id);
  if (!isMember) {
    return ctx.reply(
      `👋 <b>እንኳን ወደ VIVA TECH EXCHANGE በደህና መጡ!</b>\n\n⚠️ ቦቱን ለመጠቀም እባክዎ መጀመሪያ ቻናላችንን ይቀላቀሉ፡\n📢 ${MAIN_CHANNEL}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📢 ቻናሉን ተቀላቀል', `https://t.me/${MAIN_CHANNEL.replace('@', '')}`)],
          [Markup.button.callback('✅ ተቀላቅያለሁ / አረጋግጥ', 'check_member')]
        ])
      }
    );
  }

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { firstName: ctx.from.first_name, username: ctx.from.username, step: 'none', tempOrder: {} },
    { upsert: true }
  );

  const welcomeMsg = 
    `👋 <b>እንኳን ወደ VIVA TECH EXCHANGE በደህና መጡ!</b> 💕\n\n` +
    `🔐 <b>ደህንነቱ የተጠበቀ እና ⚡️ እጅግ ፈጣን የ USDT 💲 መገበያያ ቤት!</b>\n\n` +
    `👇 <b>የሚፈልጉትን አገልግሎት ከታች ካሉት አማራጮች ይምረጡ፡-</b>`;

  return ctx.reply(welcomeMsg, { parse_mode: 'HTML', ...mainKeyboard });
});

bot.action('check_member', async (ctx) => {
  const isMember = await isUserMember(ctx, ctx.from.id);
  if (isMember) {
    await ctx.answerCbQuery('✅ እንኳን ደህና መጡ!');
    await User.findOneAndUpdate({ telegramId: ctx.from.id }, { step: 'none' }, { upsert: true });
    return ctx.reply('👇 <b>የሚፈልጉትን አገልግሎት ይምረጡ፦</b>', { parse_mode: 'HTML', ...mainKeyboard });
  } else {
    return ctx.answerCbQuery('⚠️ አሁንም ቻናሉን አልተቀላቀሉም! እባክዎ መጀመሪያ ቻናሉን ይቀላቀሉ።', { show_alert: true });
  }
});

bot.hears(['🔻 ሰርዝ', '🔙 ወደ ዋናው ሜኑ ተመለስ', '🔁 Back', '🔁 𝗕𝗮𝗰𝗸'], async (ctx) => {
  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { step: 'none', tempOrder: {} });
  return ctx.reply('🏠 ወደ ዋናው ሜኑ ተመልሰዋል፡', mainKeyboard);
});

bot.hears(['📊 የዛሬ ዋጋ', 'የዛሬ ዋጋ'], async (ctx) => {
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

bot.hears('❓ ድጋፍ', async (ctx) => {
  const supportMsg = 
    `📞 <b>የደንበኞች ድጋፍ እና ማህበረሰብ</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👉 <b>ማንኛውም ጥያቄ፣ አስተያየት ወይም እርዳታ ከፈለጉ ያናግሩን፡-</b>\n\n` +
    `👤 <b>Admin Support፦</b> @VT_On\n` +
    `📢 <b>Telegram Channel፦</b> ${MAIN_CHANNEL}\n\n` +
    `⏰ <b>የስራ ሰዓት፦ 24/7 ሁልጊዜ ዝግጁ ነን!</b>`;
  return ctx.reply(supportMsg, { parse_mode: 'HTML', disable_web_page_preview: true, ...backKeyboard });
});

bot.hears('📋 ትዕዛዞቼ', async (ctx) => {
  const lastOrder = await Order.findOne({ telegramId: ctx.from.id }).sort({ createdAt: -1 });
  if (!lastOrder) {
    return ctx.reply('📋 <b>እስካሁን ምንም ዓይነት ትዕዛዝ አልፈጸሙም!</b>\n\nአዲስ ትዕዛዝ ለመስጠት ከዋናው ሜኑ ይምረጡ።', { parse_mode: 'HTML' });
  }

  let details = '';
  if (lastOrder.orderType === 'sell') {
    details = 
      `🔄 <b>ዓይነት፦</b> <b>USDT መሸጥ</b>\n` +
      `💵 <b>የተሸጠው መጠን፦</b> <b>${lastOrder.amount} USDT</b>\n` +
      `💰 <b>የሚከፈለው ብር፦</b> <b>${lastOrder.totalEtb} ETB</b>\n` +
      `🏦 <b>የተላከበት አካውንት፦</b> <code>${lastOrder.accountOrWallet}</code>\n` +
      `🌐 <b>ኔትወርክ፦</b> ${lastOrder.bankOrNetwork}\n`;
  } else {
    details = 
      `🔄 <b>ዓይነት፦</b> <b>USDT መግዛት</b>\n` +
      `💵 <b>የተገዛው መጠን፦</b> <b>${lastOrder.amount} USDT</b>\n` +
      `💰 <b>የተከፈለው ብር፦</b> <b>${lastOrder.totalEtb} ETB</b>\n` +
      `🎯 <b>የመቀበያ Wallet/ID፦</b> <code>${lastOrder.accountOrWallet}</code>\n`;
  }

  const msg = 
    `📋 <b>የመጨረሻ ትዕዛዝዎ ሁኔታ (Order Status)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    details +
    `📊 <b>የትዕዛዙ ሁኔታ፦</b> <b>${lastOrder.status}</b>\n\n` +
    `<blockquote>⚠️ <b>ትዕዛዝዎ በ10-30 ደቂቃ ውስጥ ተጣርቶ ምላሽ ይሰጠዋል።</b></blockquote>`;

  return ctx.reply(msg, { parse_mode: 'HTML' });
});

// ==================== SELL USDT ====================
bot.hears('🔴 USDT ለመሸጥ', async (ctx) => {
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

bot.hears('✅ ተስማምቻለሁ', async (ctx) => {
  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { step: 'waiting_sell_amount', 'tempOrder.orderType': 'sell' }
  );
  return ctx.reply(
    `<b>መሸጥ የሚፈልጉትን የ USDT መጠን በቁጥር ብቻ ያስገቡ፡-</b>\n\n🔻 <b>ዝቅተኛው መጠን 0.5 USDT ነው</b>`,
    { parse_mode: 'HTML', ...cancelKeyboard }
  );
});

bot.hears(['🏦 Telebirr', 'Telebirr'], async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user?.tempOrder?.orderType !== 'sell') return;

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { step: 'waiting_telebirr', 'tempOrder.bank': 'Telebirr' }
  );

  return ctx.reply(
    `📱 <b>እባክዎ የ Telebirr ስልክ ቁጥርዎን ያስገቡ፡-</b>\n\n💡 <b>ምሳሌ፦</b> <code>0912345678</code>`,
    { parse_mode: 'HTML', ...cancelKeyboard }
  );
});

bot.hears(['🏦 CBE ንግድ ባንክ', 'CBE ንግድ ባንክ'], async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user?.tempOrder?.orderType !== 'sell') return;

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { step: 'waiting_cbe', 'tempOrder.bank': 'CBE' }
  );

  return ctx.reply(
    `🏦 <b>እባክዎ የ CBE Account ቁጥርዎን ያስገቡ፡-</b>\n\n💡 <b>ምሳሌ፦</b> <code>1000764146453</code>`,
    { parse_mode: 'HTML', ...cancelKeyboard }
  );
});

// ==================== BUY USDT ====================
bot.hears('🟢 USDT ለመግዛት', async (ctx) => {
  const msg = 
    `📈 <b>የዛሬ የ USDT መግዣ ተመን (Rate)</b>\n\n` +
    `💵 <b>1 USDT = 193 ETB</b>\n\n` +
    `👉 <b>በዚህ ተመን ለመግዛት ተስማምተዋል?</b>`;

  const kb = Markup.keyboard([['✅ ተስማምቻለሁ (መግዛት)'], ['🔻 ሰርዝ']]).resize();
  return ctx.reply(msg, { parse_mode: 'HTML', ...kb });
});

bot.hears('✅ ተስማምቻለሁ (መግዛት)', async (ctx) => {
  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { step: 'waiting_buy_amount', 'tempOrder.orderType': 'buy' }
  );

  return ctx.reply(
    `📥 <b>መግዛት የሚፈልጉትን የ USDT መጠን በቁጥር ብቻ ያስገቡ፡-</b>\n\n⛔ <b><i>ዝቅተኛው መጠን 1 💲 USDT ነው!</i></b>`,
    { parse_mode: 'HTML', ...cancelKeyboard }
  );
});

// ==================== TEXT INPUT HANDLER ====================
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user || user.step === 'none') return;

  if (user.step === 'waiting_sell_amount') {
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

  if (user.step === 'waiting_telebirr') {
    let clean = text.replace(/[^0-9]/g, '');
    const isValid = (clean.length === 10 && (clean.startsWith('09') || clean.startsWith('07'))) ||
                    (clean.length === 9 && (clean.startsWith('9') || clean.startsWith('7')));

    if (!isValid) {
      return ctx.reply('⚠️ <b>ያስገቡት የቴሌብር ስልክ ትክክል አይደለም!</b> (ምሳሌ፦ <code>0912345678</code>)', { parse_mode: 'HTML' });
    }
    if (clean.length === 9) clean = '0' + clean;

    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_account_name', 'tempOrder.accountOrWallet': clean }
    );

    return ctx.reply(
      `👤 <b>እባክዎ የ Telebirr አካውንትዎን ሙሉ ስም ያስገቡ፡-</b>\n\n💡 <b>ምሳሌ፦</b> Abebe Kebede`,
      { parse_mode: 'HTML', ...cancelKeyboard }
    );
  }

  if (user.step === 'waiting_cbe') {
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

  if (user.step === 'waiting_account_name') {
    if (text.length < 3) {
      return ctx.reply('⚠️ እባክዎ ትክክለኛ ሙሉ ስም ያስገቡ!');
    }

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

  if (user.step === 'waiting_sell_network') {
    const sellAmt = user.tempOrder.amount || 1;
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

  if (user.step === 'waiting_buy_amount') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount < 1) {
      return ctx.reply('⚠️ <b>እባክዎ ትክክለኛ መጠን ያስገቡ! (ዝቅተኛው መግዛት 1 USDT ነው)</b>', { parse_mode: 'HTML' });
    }

    const totalEtb = (amount * 193).toFixed(2);
    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { 
        step: 'waiting_admin_buy_approval',
        'tempOrder.amount': amount,
        'tempOrder.rate': 193,
        'tempOrder.totalEtb': totalEtb
      }
    );

    const waitMsg = 
      `⏳ <b>የትዕዛዝ ጥያቄዎ ወደ Admin ተልኳል!</b>\n\n` +
      `💵 <b>መጠን፦</b> <b>${amount} USDT</b> (${totalEtb} ETB)\n\n` +
      `👉 <b>Admin ጥያቄዎን ተመልክቶ ፍቃድ እስከሚሰጥ እባክዎ በትዕግስት ይጠብቁ...</b>`;

    await ctx.reply(waitMsg, { parse_mode: 'HTML', ...Markup.keyboard([['🔁 Back']]).resize() });

    const adminMsg = 
      `🔔 <b>አዲስ የ USDT ግዢ ጥያቄ ደርሷል!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>ተጠቃሚ፦</b> @${ctx.from.username || 'የለውም'} (${ctx.from.first_name})\n` +
      `🆔 <b>User ID፦</b> <code>${ctx.from.id}</code>\n` +
      `💵 <b>መጠን፦</b> <b>${amount} USDT</b>\n` +
      `💰 <b>ጠቅላላ ብር፦</b> <b>${totalEtb} ETB</b>\n\n` +
      `👇 <b>ትዕዛዙን ይቀበላሉ?</b>`;

    const adminKb = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ ፍቀድ (Accept)', `accept_buy_${ctx.from.id}`),
        Markup.button.callback('❌ ሰርዝ (Reject)', `reject_buy_${ctx.from.id}`)
      ]
    ]);

    return ctx.telegram.sendMessage(ADMIN_ID, adminMsg, { parse_mode: 'HTML', ...adminKb });
  }

  if (user.step === 'waiting_buy_network') {
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

  if (user.step === 'waiting_wallet_address') {
    await User.findOneAndUpdate(
      { telegramId: ctx.from.id },
      { step: 'waiting_screenshot', 'tempOrder.accountOrWallet': text }
    );

    const buyAmt = user.tempOrder.amount;
    const totalEtb = user.tempOrder.totalEtb;
    const net = user.tempOrder.bankOrNetwork;

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
});

// ==================== PHOTO HANDLER ====================
bot.on('photo', async (ctx) => {
  if (ctx.from.id === ADMIN_ID) {
    return handleAdminPhoto(ctx);
  }

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user || user.step !== 'waiting_screenshot') return;

  const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  const temp = user.tempOrder;
  const orderId = 'ORD-' + Date.now();

  await Order.create({
    orderId,
    telegramId: ctx.from.id,
    username: ctx.from.username || '',
    firstName: ctx.from.first_name,
    orderType: temp.orderType,
    amount: temp.amount,
    totalEtb: temp.totalEtb,
    rate: temp.rate,
    bankOrNetwork: temp.bankOrNetwork || temp.bank,
    accountOrWallet: temp.accountOrWallet,
    accountName: temp.accountName || '',
    userProofPhotoId: photoId,
    status: '⏳ በመጠባበቅ ላይ (Pending)'
  });

  await User.findOneAndUpdate({ telegramId: ctx.from.id }, { step: 'none', tempOrder: {} });

  const successMsg = 
    `✅ <b>ትዕዛዝዎ በተሳካ ሁኔታ ደርሶናል!</b>\n\n` +
    `⏳ <b>ክፍያው በ Admin ተረጋግጦ በጥቂት ደቂቃዎች ውስጥ ይፈጸማል።</b>\n\n` +
    `💎 <b>𝗩𝗶𝘃𝗮 𝗣𝟮𝗣 𝗘𝘅𝗰𝗵𝗮𝗻𝗴𝗲 ን ስለመረጡ እናመሰግናለን!</b>`;
  await ctx.reply(successMsg, { parse_mode: 'HTML', ...mainKeyboard });

  let adminReport = '';
  if (temp.orderType === 'buy') {
    adminReport = 
      `🟢 <b>አዲስ የUSDT ግዢ (Buy) ትዕዛዝ ደርሷል!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>የትዕዛዝ ቁጥር፦</b> <code>${orderId}</code>\n` +
      `👤 <b>ደንበኛ፦</b> @${ctx.from.username || 'የለውም'} (${ctx.from.first_name})\n` +
      `🆔 <b>Telegram ID፦</b> <code>${ctx.from.id}</code>\n` +
      `💵 <b>የሚገዛው መጠን፦</b> <b>${temp.amount} USDT</b>\n` +
      `💰 <b>ደንበኛው የከፈለው ብር፦</b> <b>${temp.totalEtb} ETB</b>\n` +
      `🔗 <b>ኔትወርክ፦</b> ${temp.bankOrNetwork}\n` +
      `🎯 <b>መላኪያ Wallet/ID፦</b> <code>${temp.accountOrWallet}</code>`;
  } else {
    adminReport = 
      `🚨 <b>አዲስ የUSDT ሽያጭ (Sell) ትዕዛዝ ደርሷል!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>የትዕዛዝ ቁጥር፦</b> <code>${orderId}</code>\n` +
      `👤 <b>ደንበኛ፦</b> @${ctx.from.username || 'የለውም'} (${ctx.from.first_name})\n` +
      `🆔 <b>Telegram ID፦</b> <code>${ctx.from.id}</code>\n` +
      `🏦 <b>ባንክ፦</b> <b>${temp.bank}</b>\n` +
      `👤 <b>የአካውንት ስም፦</b> <b>${temp.accountName}</b>\n` +
      `📱 <b>የደንበኛው አካውንት/ስልክ፦</b> <code>${temp.accountOrWallet}</code>\n` +
      `💵 <b>የሚሸጠው መጠን፦</b> <b>${temp.amount} USDT</b>\n` +
      `💰 <b>እርስዎ የሚልኩለት ብር፦</b> <b>${temp.totalEtb} ETB</b>\n` +
      `🔗 <b>የላከበት አውታር፦</b> ${temp.bankOrNetwork}`;
  }

  const adminActions = Markup.inlineKeyboard([
    [Markup.button.callback('💳 ክፍያ ፈጽሜ ደረሰኝ እልካለሁ', `pay_order_${orderId}`)],
    [Markup.button.callback('❌ ውድቅ አድርግ (Reject)', `reject_order_${orderId}`)]
  ]);

  await ctx.telegram.sendPhoto(ADMIN_ID, photoId, {
    caption: adminReport,
    parse_mode: 'HTML',
    ...adminActions
  });
});

// ==================== CALLBACKS ====================
bot.action(/accept_buy_(\d+)/, async (ctx) => {
  const targetUserId = parseInt(ctx.match[1]);
  await User.findOneAndUpdate({ telegramId: targetUserId }, { step: 'waiting_buy_network' });

  const askNet = 
    `🎉 <b>ትዕዛዝዎ በ Admin ተፈቅዷል!</b> ✅\n\n` +
    `👉 <b>ገንዘብዎን (USDT) በምንድነው መቀበል የሚፈልጉት❓</b>\n\n` +
    `🎯 <b>እባክዎ ከታች ካሉት አማራጮች አንዱን ይምረጡ፡-</b>`;

  const netKb = Markup.keyboard([
    ['🟠 Binance ID', '🟡 USDT (BEP-20)'],
    ['🔵 TON', '🟣 Aptos'],
    ['🔻 ሰርዝ']
  ]).resize();

  await ctx.telegram.sendMessage(targetUserId, askNet, { parse_mode: 'HTML', ...netKb });
  await ctx.editMessageReplyMarkup(null);
  return ctx.reply('✅ ጥያቄው ተፈቅዷል፤ ደንበኛው ኔትወርክ እንዲመርጥ ተልኮለታል።');
});

bot.action(/reject_buy_(\d+)/, async (ctx) => {
  const targetUserId = parseInt(ctx.match[1]);
  await User.findOneAndUpdate({ telegramId: targetUserId }, { step: 'none', tempOrder: {} });

  const rejectMsg = 
    `🚫 <b>የትዕዛዝ ጥያቄዎ ውድቅ ተደርጓል!</b> ❌\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `⚠️ <b>ምክንያት፦</b> <b>በቂ የሆነ የ USDT ክምችት በዋሌታችን ውስጥ ባለመኖሩ ነው።</b>\n\n` +
    `<blockquote>🔄 <b>እባክዎ ቆይተው በድጋሚ ይሞክሩ ወይም Admin ያናግሩ።</b></blockquote>`;

  await ctx.telegram.sendMessage(targetUserId, rejectMsg, { parse_mode: 'HTML', ...mainKeyboard });
  await ctx.editMessageReplyMarkup(null);
  return ctx.reply('❌ ትዕዛዙ ውድቅ ተደርጓል፤ ለተጠቃሚው ተልኳል።');
});

bot.action(/pay_order_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  await User.findOneAndUpdate(
    { telegramId: ADMIN_ID },
    { step: `admin_waiting_proof_${orderId}` }
  );

  return ctx.reply(
    `📸 <b>ትዕዛዝ #${orderId}</b>\n\nእባክዎ ለደንበኛው የፈጸሙበትን <b>የክፍያ ደረሰኝ (Screenshot)</b> አሁን ይላኩ፡-`,
    { parse_mode: 'HTML' }
  );
});

bot.action(/reject_order_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const order = await Order.findOne({ orderId });
  if (!order) return ctx.reply('⚠️ ትዕዛዙ አልተገኘም!');

  order.status = '❌ ውድቅ ተደርጓል (Rejected)';
  await order.save();

  const rejectMsg = 
    `🚫 <b>ትዕዛዝዎ ውድቅ ተደርጓል!</b> ❌\n\n` +
    `⚠️ <b>የላኩት የክፍያ ስክሪንሾት ትክክል አይደለም።</b>\n\n` +
    `🔄 <b>እባክዎ መረጃዎን አስተካክለው በድጋሚ ይሞክሩ።</b>\n` +
    `💬 <b>ለተጨማሪ እርዳታ፦</b> @VT_On`;

  await ctx.telegram.sendMessage(order.telegramId, rejectMsg, { parse_mode: 'HTML', ...mainKeyboard });
  await ctx.editMessageReplyMarkup(null);
  return ctx.reply('❌ ትዕዛዙ ውድቅ ተደርጎ ለደንበኛው ተልኳል።');
});

// ==================== AUTO POST TO PROOF CHANNEL ====================
async function handleAdminPhoto(ctx) {
  const adminUser = await User.findOne({ telegramId: ADMIN_ID });
  if (!adminUser || !adminUser.step?.startsWith('admin_waiting_proof_')) return;

  const orderId = adminUser.step.replace('admin_waiting_proof_', '');
  const order = await Order.findOne({ orderId });
  if (!order) return ctx.reply('⚠️ ይህ ትዕዛዝ አልተገኘም!');

  const adminProofPhotoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

  order.status = '✅ ተጠናቋል (Completed)';
  order.adminProofPhotoId = adminProofPhotoId;
  await order.save();

  await User.findOneAndUpdate({ telegramId: ADMIN_ID }, { step: 'none' });

  let userDoneMsg = '';
  if (order.orderType === 'sell') {
    userDoneMsg = 
      `🏆 <b>ትዕዛዝዎ በተሳካ ሁኔታ ተጠናቋል!</b> ✅\n\n` +
      `💸 <b>ያዘዙት የ ${order.totalEtb} ETB ክፍያ ወደ ሂሳብዎ ገቢ ተደርጓል።</b>\n` +
      `📄 የክፍያ ደረሰኙ ከላይ ተያይዟል፤ እባክዎ ሂሳብዎን ያረጋግጡ!\n\n` +
      `🌟 <b>𝗩𝗶𝘃𝗮 𝗣𝟮𝗣 𝗘𝘅𝗰𝗵𝗮𝗻𝗴𝗲 ን ስለመረጡ እናመሰግናለን!</b> 🙏`;
  } else {
    userDoneMsg = 
      `🏆 <b>ትዕዛዝዎ በተሳካ ሁኔታ ተጠናቋል!</b> ✅\n\n` +
      `💎 <b>የገዙት ${order.amount} USDT ወደ አድራሻዎ በተሳካ ሁኔታ ተልኳል!</b>\n` +
      `📄 የክፍያ ደረሰኙ ከላይ ተያይዟል፤ እባክዎ Walletዎን ያረጋግጡ!\n\n` +
      `🌟 <b>𝗩𝗶𝘃𝗮 𝗣𝟮𝗣 𝗘𝘅𝗰𝗵𝗮𝗻𝗴𝗲 ን ስለመረጡ እናመሰግናለን!</b> 🙏`;
  }

  try {
    await ctx.telegram.sendPhoto(order.telegramId, adminProofPhotoId, {
      caption: userDoneMsg,
      parse_mode: 'HTML'
    });
  } catch (err) {
    console.error('Error sending proof to user:', err);
  }

  const maskedPhone = maskAccount(order.accountOrWallet);
  const clientUsername = order.username ? `@${order.username}` : (order.firstName || 'Anonymous');

  let channelCaption = '';
  if (order.orderType === 'sell') {
    channelCaption = 
      `✅ <b>አዲስ የተጠናቀቀ የሽያጭ ትዕዛዝ (SELL COMPLETED)</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>ደንበኛ (Seller)፦</b> ${clientUsername}\n` +
      `💵 <b>የተሸጠው መጠን፦</b> <b>${order.amount} USDT</b>\n` +
      `💰 <b>የተከፈለው ብር፦</b> <b>${order.totalEtb} ETB</b>\n` +
      `🏦 <b>የክፍያ ዘዴ፦</b> ${order.bankOrNetwork}\n` +
      `📱 <b>የተላከበት ሂሳብ፦</b> <code>${maskedPhone}</code>\n` +
      `⚡️ <b>ሁኔታ፦</b> <b>በተሳካ ሁኔታ ተከፍሏል (PAID) ✅</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📢 <b>የክፍያ ማረጋገጫ፦</b> @Viva_online_proof\n` +
      `🌐 <b>ዋና ቻናል፦</b> ${MAIN_CHANNEL}`;
  } else {
    channelCaption = 
      `✅ <b>አዲስ የተጠናቀቀ የግዢ ትዕዛዝ (BUY COMPLETED)</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>ደንበኛ (Buyer)፦</b> ${clientUsername}\n` +
      `💵 <b>የተገዛው መጠን፦</b> <b>${order.amount} USDT</b>\n` +
      `💰 <b>የተከፈለው ብር፦</b> <b>${order.totalEtb} ETB</b>\n` +
      `🔗 <b>ኔትወርክ፦</b> ${order.bankOrNetwork}\n` +
      `🎯 <b>መቀበያ አድራሻ፦</b> <code>${maskedPhone}</code>\n` +
      `⚡️ <b>ሁኔታ፦</b> <b>ክሪፕቶው ተላልፏል (SENT) ✅</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📢 <b>የክፍያ ማረጋገጫ፦</b> @Viva_online_proof\n` +
      `🌐 <b>ዋና ቻናል፦</b> ${MAIN_CHANNEL}`;
  }

  try {
    await ctx.telegram.sendPhoto(PROOF_CHANNEL, adminProofPhotoId, {
      caption: channelCaption,
      parse_mode: 'HTML'
    });
    await ctx.reply(`🎉 <b>ትዕዛዝ #${orderId} ጸድቋል!</b>\n\n1. ደረሰኙ ለደንበኛው ደርሷል።\n2. ወደ @Viva_online_proof ፖስት ተደርጓል።`, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('Channel post error:', err);
    await ctx.reply(`⚠️ ትዕዛዙ ጸድቋል፤ ነገር ግን ወደ @Viva_online_proof ፖስት ሲደረግ ችግር ገጥሟል (ቦቱ ቻናሉ ላይ Admin እና "Post Messages" ፍቃድ እንዳለው ያረጋግጡ)።`);
  }
}

bot.launch().then(() => {
  console.log('VIVA P2P Bot is running with Auto-Proof Channel feature!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
