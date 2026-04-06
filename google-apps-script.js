/**
 * FiscaBot – Google Apps Script
 * ============================================================
 * Ce script surveille votre boîte Gmail pour les emails
 * contenant des questions fiscales et y répond automatiquement
 * via l'API Gemini (Google AI Studio).
 *
 * INSTALLATION :
 * 1. Ouvrez https://script.google.com et créez un nouveau projet
 * 2. Collez ce code dans l'éditeur
 * 3. Remplacez GEMINI_API_KEY par votre clé API AI Studio
 * 4. Remplacez GMAIL_LABEL_NAME si vous souhaitez un label différent
 * 5. Cliquez sur "Exécuter" → "processIncomingFiscalEmails" pour tester
 * 6. Configurez un déclencheur : Déclencheurs → Ajouter un déclencheur
 *    - Fonction : processIncomingFiscalEmails
 *    - Type : Déclencheur temporisé → Toutes les 5 minutes
 * ============================================================
 */

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
var CONFIG = {
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',      // ← Remplacez par votre clé API
  GEMINI_MODEL:   'gemini-1.5-flash',
  GEMINI_URL:     'https://generativelanguage.googleapis.com/v1beta/models/',

  // Label Gmail créé automatiquement pour marquer les emails traités
  GMAIL_LABEL_NAME: 'FiscaBot/Traité',

  // Mots-clés dans l'objet de l'email pour détecter une question fiscale
  // (laissez vide [] pour traiter tous les emails non lus)
  SUBJECT_KEYWORDS: ['fiscal', 'tva', 'impôt', 'impot', 'comptab', 'facturation', 'taxe', 'is ', 'ir '],

  // Email(s) expéditeurs à traiter (laissez vide [] pour traiter tous)
  ALLOWED_SENDERS: [],

  // Nombre maximum d'emails traités par exécution (évite les timeouts)
  MAX_EMAILS_PER_RUN: 10,

  // Signature ajoutée à chaque réponse automatique
  SIGNATURE: '\n\n---\n🤖 Réponse automatique de FiscaBot – Conseiller Fiscal CHOCOLOLO\n' +
             '⚠️ Ces informations sont données à titre indicatif. Consultez un expert-comptable pour des conseils personnalisés.\n' +
             '📧 Propulsé par Google Gemini AI | CHOCOLOLO – Parfums de Niche Luxe'
};

// ─── SYSTEM PROMPT FISCALITÉ ──────────────────────────────────────────────────
var SYSTEM_PROMPT = 'Tu es FiscaBot, un assistant spécialiste en fiscalité française, dédié à l\'entreprise CHOCOLOLO, une maison de parfums de niche de luxe.\n\n' +
  'Ton rôle :\n' +
  '- Répondre aux questions fiscales liées à une PME française vendant des parfums de luxe\n' +
  '- Expliquer clairement la TVA (taux applicables, récupération, déclarations)\n' +
  '- Conseiller sur l\'impôt sur les sociétés (IS) et l\'impôt sur le revenu (IR)\n' +
  '- Informer sur les régimes fiscaux (micro-entreprise, réel simplifié, réel normal)\n' +
  '- Expliquer la TVA intracommunautaire pour les ventes en Europe\n' +
  '- Guider sur la facturation conforme, les mentions obligatoires, les délais\n' +
  '- Informer sur les charges sociales et la fiscalité des dirigeants\n' +
  '- Répondre sur les avantages fiscaux (CIR, crédit d\'impôt, amortissements)\n\n' +
  'Règles :\n' +
  '- Réponds toujours en français\n' +
  '- Sois précis, professionnel et pédagogique\n' +
  '- Réponds directement à la question posée dans l\'email\n' +
  '- Format : texte clair sans markdown (email texte simple)\n' +
  '- Ne donne pas de conseils personnalisés engageant ta responsabilité légale\n' +
  '- Reste concis (3-5 paragraphes maximum)\n\n' +
  'Contexte CHOCOLOLO : PME française vendant des parfums de niche haut de gamme (95€–115€), TVA 20%.';

// ─── FONCTION PRINCIPALE ──────────────────────────────────────────────────────
/**
 * Fonction principale à déclencher toutes les 5 minutes.
 * Recherche les emails non lus avec des questions fiscales et répond automatiquement.
 */
function processIncomingFiscalEmails() {
  if (CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
    Logger.log('⚠️ ERREUR : Veuillez configurer votre clé API Gemini dans CONFIG.GEMINI_API_KEY');
    return;
  }

  var label = getOrCreateLabel(CONFIG.GMAIL_LABEL_NAME);
  var threads = getUnprocessedEmailThreads();

  Logger.log('FiscaBot : ' + threads.length + ' thread(s) à traiter');

  var processed = 0;
  for (var i = 0; i < threads.length && processed < CONFIG.MAX_EMAILS_PER_RUN; i++) {
    var thread = threads[i];
    try {
      if (processThread(thread, label)) {
        processed++;
      }
    } catch (e) {
      Logger.log('Erreur sur le thread ' + thread.getId() + ' : ' + e.message);
    }
  }

  Logger.log('FiscaBot : ' + processed + ' email(s) traité(s)');
}

// ─── RECHERCHE DES EMAILS ─────────────────────────────────────────────────────
function getUnprocessedEmailThreads() {
  var query = 'is:unread -label:' + CONFIG.GMAIL_LABEL_NAME.replace('/', '-');

  // Filtre par mots-clés dans l'objet
  if (CONFIG.SUBJECT_KEYWORDS.length > 0) {
    var keywordQuery = CONFIG.SUBJECT_KEYWORDS.map(function (kw) {
      return 'subject:' + kw;
    }).join(' OR ');
    query += ' (' + keywordQuery + ')';
  }

  // Filtre par expéditeurs autorisés
  if (CONFIG.ALLOWED_SENDERS.length > 0) {
    var senderQuery = CONFIG.ALLOWED_SENDERS.map(function (s) {
      return 'from:' + s;
    }).join(' OR ');
    query += ' (' + senderQuery + ')';
  }

  return GmailApp.search(query, 0, CONFIG.MAX_EMAILS_PER_RUN);
}

// ─── TRAITEMENT D'UN THREAD ────────────────────────────────────────────────────
function processThread(thread, label) {
  var messages = thread.getMessages();
  var lastMessage = messages[messages.length - 1];

  // Ne pas répondre à nos propres réponses automatiques
  var senderEmail = lastMessage.getFrom();
  var myEmail = Session.getActiveUser().getEmail();
  if (senderEmail.indexOf(myEmail) !== -1) {
    thread.markRead();
    return false;
  }

  var subject = lastMessage.getSubject();
  var body = lastMessage.getPlainBody();

  // Limiter la longueur du corps pour éviter les tokens excessifs
  if (body.length > 3000) {
    body = body.substring(0, 3000) + '...\n[Message tronqué pour traitement]';
  }

  Logger.log('Traitement email de : ' + senderEmail + ' | Sujet : ' + subject);

  // Appel Gemini
  var question = 'Objet de l\'email : ' + subject + '\n\nContenu :\n' + body;
  var answer = callGeminiAPI(question);

  if (!answer) {
    Logger.log('Échec de la réponse Gemini pour : ' + subject);
    return false;
  }

  // Envoi de la réponse
  var replySubject = subject.startsWith('Re:') ? subject : 'Re: ' + subject;
  var replyBody = 'Bonjour,\n\nMerci pour votre question fiscale. Voici ma réponse :\n\n' +
                  answer + CONFIG.SIGNATURE;

  lastMessage.reply(replyBody);

  // Marquage et label
  thread.markRead();
  thread.addLabel(label);

  Logger.log('✅ Réponse envoyée à : ' + senderEmail);
  return true;
}

// ─── APPEL API GEMINI ─────────────────────────────────────────────────────────
function callGeminiAPI(userMessage) {
  var url = CONFIG.GEMINI_URL + CONFIG.GEMINI_MODEL + ':generateContent?key=' + CONFIG.GEMINI_API_KEY;

  var payload = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [
      { role: 'user', parts: [{ text: userMessage }] }
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
      topP: 0.9
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      Logger.log('Erreur API Gemini ' + statusCode + ' : ' + response.getContentText());
      return null;
    }

    var data = JSON.parse(response.getContentText());

    if (data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    }

    Logger.log('Réponse API inattendue : ' + response.getContentText());
    return null;

  } catch (e) {
    Logger.log('Exception lors de l\'appel Gemini : ' + e.message);
    return null;
  }
}

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────
function getOrCreateLabel(labelName) {
  var label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
    Logger.log('Label créé : ' + labelName);
  }
  return label;
}

/**
 * Fonction de test : envoie une question fiscale de test à Gemini et affiche la réponse.
 * Exécutez cette fonction depuis l'éditeur Apps Script pour vérifier la configuration.
 */
function testGeminiConnection() {
  if (CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
    Logger.log('⚠️ Veuillez d\'abord configurer CONFIG.GEMINI_API_KEY');
    return;
  }

  var testQuestion = 'Quel est le taux de TVA applicable sur les parfums en France en 2025 ?';
  Logger.log('Question test : ' + testQuestion);

  var answer = callGeminiAPI(testQuestion);
  if (answer) {
    Logger.log('✅ Réponse Gemini reçue :\n' + answer);
  } else {
    Logger.log('❌ Échec de la connexion à l\'API Gemini');
  }
}
