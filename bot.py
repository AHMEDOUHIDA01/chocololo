#!/usr/bin/env python3
import os
import logging
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, filters
from dotenv import load_dotenv
from storage import ConversationStorage
from gemini_client import generate_response

load_dotenv()

TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN')
if not TELEGRAM_TOKEN:
    raise RuntimeError('TELEGRAM_TOKEN not set in environment')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

storage = ConversationStorage()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('Bonjour! Je suis FiscalAdvisorBot. Posez votre question sur la fiscalité marocaine.')

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    text = update.message.text
    chat_id = update.effective_chat.id

    # Save incoming message
    storage.save_message(chat_id, user.username or str(user.id), 'user', text)

    # Retrieve recent history for context
    history = storage.get_last_messages(chat_id, limit=10)

    # Generate response via Gemini wrapper
    answer = generate_response(text, history)

    # Save bot response
    storage.save_message(chat_id, 'bot', 'assistant', answer)

    await update.message.reply_text(answer)

def main():
    app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler('start', start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info('Starting bot...')
    app.run_polling()

if __name__ == '__main__':
    main()