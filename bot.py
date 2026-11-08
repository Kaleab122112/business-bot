import os
import asyncio
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters
from pymongo import MongoClient

# Render Web Service ጤናማ መሆኑን የሚያረጋግጥበት አነስተኛ ሰርቨር
class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Bot is running successfully!")

    def do_HEAD(self):
        self.send_response(200)
        self.end_headers()

def run_server():
    port = int(os.environ.get("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), SimpleHandler)
    server.serve_forever()

BOT_TOKEN = os.getenv("BOT_TOKEN")
MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client["business_db"]
users_col = db["users"]

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    try:
        users_col.update_one(
            {"user_id": user.id},
            {"$set": {"name": user.full_name, "username": user.username}},
            upsert=True
        )
    except Exception as e:
        print(f"Database error: {e}")

    keyboard = [
        ["🛍 የዕቃዎች ዝርዝር", "📦 የትዕዛዝ ሁኔታ"],
        ["📞 አድራሻ / ያግኙን", "ℹ️ ስለ እኛ"]
    ]
    reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
    await update.message.reply_text(
        f"ሰላም {user.first_name}፣ እንኳን ወደ ቢዝነስ ቦቱ በደህና መጡ!",
        reply_markup=reply_markup
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if text == "🛍 የዕቃዎች ዝርዝር":
        await update.message.reply_text("የእቃዎች ዝርዝር በቅርቡ እዚህ ይዘረዘራል...")
    elif text == "📦 የትዕዛዝ ሁኔታ":
        await update.message.reply_text("ትዕዛዝዎን ለመከታተል የትዕዛዝ ቁጥርዎን ያስገቡ።")
    elif text == "📞 አድራሻ / ያግኙን":
        await update.message.reply_text("ስልክ፡ +2519...\nቴሌግራም፡ @YourUsername")
    elif text == "ℹ️ ስለ እኛ":
        await update.message.reply_text("ይህ የድርጅታችን ይፋዊ የቴሌግራም ቦት ነው።")
    else:
        await update.message.reply_text("እባክዎ ከታች ያሉትን ምርጫዎች ይጠቀሙ።")

async def main():
    print("Bot is starting...")
    app = ApplicationBuilder().token(BOT_TOKEN).job_queue(None).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # ቦቱን በይፋ ማስጀመር
    async with app:
        await app.start()
        await app.updater.start_polling()
        # ላልተወሰነ ጊዜ ነቅቶ እንዲቆይ ማድረግ
        while True:
            await asyncio.sleep(3600)

if __name__ == "__main__":
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    asyncio.run(main())
