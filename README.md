# Fiscal Advisor Bot (starter)

Bot Telegram en Python fournissant des avis fiscaux contextuels pour le Maroc. Ce repo contient un starter pour :
- Intégration Telegram
- Intégration (placeholder) Google Gemini
- Historique de conversation (SQLite)

Prérequis:
- Python 3.10+
- Avoir un token Telegram Bot (TELEGRAM_TOKEN)
- Avoir accès à l'API Generative AI / Gemini (GEMINI_API_KEY, GEMINI_MODEL)

Installation rapide:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# remplir .env avec vos clés
python bot.py
```

Déploiement:
- Voir Dockerfile pour conteneurisation

Notes:
- Le module gemini_client.py contient des exemples d'appel; adapter selon l'API officielle Google generative.
- Ce projet ne fournit pas de conseil juridique ou fiscal contraignant. Toujours vérifier auprès d'un professionnel.