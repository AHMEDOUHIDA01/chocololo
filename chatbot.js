/**
 * Chatbot Fiscaliste – Chocololo
 * Powered by Google Gemini API (AI Studio)
 *
 * Remplacez YOUR_GEMINI_API_KEY ci-dessous par votre clé API obtenue sur
 * https://aistudio.google.com/app/apikey
 */

(function () {
    'use strict';

    // ─── CONFIGURATION ────────────────────────────────────────────────────────
    const CONFIG = {
        apiKey: 'YOUR_GEMINI_API_KEY',          // ← Remplacez par votre clé API
        model: 'gemini-1.5-flash',              // Modèle Gemini rapide et gratuit
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
        maxTokens: 1024,
        temperature: 0.4,
        gmailContact: 'votre.email@gmail.com',  // ← Remplacez par votre Gmail
    };

    // ─── SYSTEM PROMPT FISCALITÉ ──────────────────────────────────────────────
    const SYSTEM_PROMPT = `Tu es FiscaBot, un assistant spécialiste en fiscalité française, dédié à l'entreprise CHOCOLOLO, une maison de parfums de niche de luxe.

Ton rôle :
- Répondre aux questions fiscales liées à une PME française vendant des parfums de luxe
- Expliquer clairement la TVA (taux applicables, récupération, déclarations)
- Conseiller sur l'impôt sur les sociétés (IS) et l'impôt sur le revenu (IR) pour les dirigeants
- Informer sur les régimes fiscaux (micro-entreprise, réel simplifié, réel normal)
- Expliquer la TVA intracommunautaire pour les ventes en Europe
- Guider sur la facturation conforme, les mentions obligatoires, les délais
- Informer sur les charges sociales et la fiscalité des dirigeants
- Répondre sur les avantages fiscaux (CIR, crédit d'impôt, amortissements)
- Expliquer les obligations comptables et fiscales d'une société vendant des parfums (produits de luxe, accises éventuelles)

Règles :
- Réponds toujours en français
- Sois précis, professionnel et pédagogique
- Si une question dépasse tes compétences ou nécessite un expert-comptable, dis-le clairement
- Ne donne pas de conseils personnalisés engageant ta responsabilité légale sans recommander de consulter un professionnel
- Reste concis (3-5 paragraphes maximum sauf si nécessaire)
- Pour les montants et taux, précise toujours l'année de référence (2025/2026)

Contexte CHOCOLOLO :
- Entreprise française de parfums de niche haut de gamme
- Vente en ligne et potentiellement en boutique
- Produits vendus entre 95€ et 115€ (TVA 20% sur parfums)
- Peut vendre à des clients particuliers (B2C) et professionnels (B2B) en France et en Europe`;

    // ─── QUESTIONS SUGGÉRÉES ──────────────────────────────────────────────────
    const SUGGESTIONS = [
        'Quel taux de TVA pour les parfums ?',
        'Comment déclarer la TVA ?',
        'IS ou IR pour mon entreprise ?',
        'Facturation obligatoire : que mettre ?',
        'TVA ventes en Europe ?',
    ];

    // ─── HISTORIQUE DE CONVERSATION ──────────────────────────────────────────
    let conversationHistory = [];

    // ─── ÉLÉMENTS DOM ─────────────────────────────────────────────────────────
    let toggleBtn, chatWindow, messagesContainer, inputField, sendBtn, suggestionsContainer;

    // ─── INITIALISATION ───────────────────────────────────────────────────────
    function init() {
        injectHTML();
        bindElements();
        bindEvents();
        addBotMessage(
            '👋 Bonjour ! Je suis **FiscaBot**, votre assistant fiscaliste dédié à CHOCOLOLO.\n\n' +
            'Je suis spécialisé en fiscalité française pour les entreprises de parfums : TVA, IS/IR, facturation, obligations comptables...\n\n' +
            'Comment puis-je vous aider aujourd\'hui ?'
        );
        renderSuggestions();
    }

    function injectHTML() {
        const html = `
        <button id="chatbot-toggle" title="Parler au conseiller fiscal">💬</button>

        <div id="chatbot-window" role="dialog" aria-label="Chatbot FiscaBot">
            <div id="chatbot-header">
                <div class="bot-avatar">⚖️</div>
                <div class="bot-info">
                    <h4>FiscaBot – Conseiller Fiscal</h4>
                    <p>Spécialiste fiscalité française</p>
                </div>
                <span class="status-dot" title="En ligne"></span>
                <button id="chatbot-close" aria-label="Fermer le chat">×</button>
            </div>

            <div id="chatbot-messages" aria-live="polite"></div>

            <div id="chatbot-suggestions"></div>

            <div id="chatbot-input-area">
                <textarea
                    id="chatbot-input"
                    placeholder="Posez votre question fiscale..."
                    rows="1"
                    aria-label="Message"
                ></textarea>
                <button id="chatbot-send" aria-label="Envoyer">➤</button>
            </div>

            <p id="chatbot-disclaimer">
                ⚠️ Informations indicatives – Consultez un expert-comptable pour des conseils personnalisés.
            </p>
        </div>`;

        const wrapper = document.createElement('div');
        wrapper.id = 'chatbot-root';
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);
    }

    function bindElements() {
        toggleBtn          = document.getElementById('chatbot-toggle');
        chatWindow         = document.getElementById('chatbot-window');
        messagesContainer  = document.getElementById('chatbot-messages');
        inputField         = document.getElementById('chatbot-input');
        sendBtn            = document.getElementById('chatbot-send');
        suggestionsContainer = document.getElementById('chatbot-suggestions');
    }

    function bindEvents() {
        toggleBtn.addEventListener('click', toggleChat);
        document.getElementById('chatbot-close').addEventListener('click', closeChat);

        sendBtn.addEventListener('click', handleSend);
        inputField.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        // Auto-resize textarea
        inputField.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });
    }

    // ─── TOGGLE / OPEN / CLOSE ────────────────────────────────────────────────
    function toggleChat() {
        if (chatWindow.classList.contains('open')) {
            closeChat();
        } else {
            openChat();
        }
    }

    function openChat() {
        chatWindow.classList.add('open');
        toggleBtn.textContent = '✕';
        inputField.focus();
        scrollToBottom();
    }

    function closeChat() {
        chatWindow.classList.remove('open');
        toggleBtn.textContent = '💬';
    }

    // ─── MESSAGES ────────────────────────────────────────────────────────────
    function addBotMessage(text) {
        const div = document.createElement('div');
        div.className = 'chat-message bot';
        div.innerHTML = formatMarkdown(text);
        messagesContainer.appendChild(div);
        scrollToBottom();
        return div;
    }

    function addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'chat-message user';
        div.textContent = text;
        messagesContainer.appendChild(div);
        scrollToBottom();
    }

    function addTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'chat-message typing';
        div.id = 'typing-indicator';
        div.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
        messagesContainer.appendChild(div);
        scrollToBottom();
        return div;
    }

    function removeTypingIndicator() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Simple markdown → HTML (bold, newlines)
    function formatMarkdown(text) {
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    // ─── SUGGESTIONS ──────────────────────────────────────────────────────────
    function renderSuggestions() {
        suggestionsContainer.innerHTML = '';
        SUGGESTIONS.forEach(function (q) {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.textContent = q;
            btn.addEventListener('click', function () {
                inputField.value = q;
                handleSend();
                suggestionsContainer.innerHTML = '';
            });
            suggestionsContainer.appendChild(btn);
        });
    }

    // ─── ENVOI DE MESSAGE ────────────────────────────────────────────────────
    function handleSend() {
        const text = inputField.value.trim();
        if (!text) return;

        if (CONFIG.apiKey === 'YOUR_GEMINI_API_KEY') {
            addBotMessage(
                '⚠️ **Configuration requise**\n\n' +
                'Veuillez remplacer `YOUR_GEMINI_API_KEY` dans le fichier `chatbot.js` par votre clé API Gemini.\n\n' +
                'Obtenez votre clé sur [aistudio.google.com](https://aistudio.google.com/app/apikey).'
            );
            return;
        }

        addUserMessage(text);
        inputField.value = '';
        inputField.style.height = 'auto';
        sendBtn.disabled = true;

        conversationHistory.push({ role: 'user', parts: [{ text: text }] });

        const typingEl = addTypingIndicator();

        callGeminiAPI(text)
            .then(function (reply) {
                removeTypingIndicator();
                conversationHistory.push({ role: 'model', parts: [{ text: reply }] });
                addBotMessage(reply);
            })
            .catch(function (err) {
                removeTypingIndicator();
                console.error('FiscaBot error:', err);
                addBotMessage(
                    '❌ Une erreur est survenue lors de la connexion à l\'API.\n\n' +
                    'Vérifiez votre clé API Gemini et votre connexion internet.\n\n' +
                    'Erreur : ' + (err.message || 'Inconnue')
                );
            })
            .finally(function () {
                sendBtn.disabled = false;
                inputField.focus();
            });
    }

    // ─── APPEL API GEMINI ────────────────────────────────────────────────────
    function callGeminiAPI(userMessage) {
        const url = CONFIG.apiUrl + CONFIG.model + ':generateContent?key=' + CONFIG.apiKey;

        const body = {
            system_instruction: {
                parts: [{ text: SYSTEM_PROMPT }]
            },
            contents: conversationHistory,
            generationConfig: {
                temperature: CONFIG.temperature,
                maxOutputTokens: CONFIG.maxTokens,
                topP: 0.9,
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            ]
        };

        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        .then(function (response) {
            if (!response.ok) {
                return response.json().then(function (err) {
                    throw new Error(err.error ? err.error.message : 'HTTP ' + response.status);
                });
            }
            return response.json();
        })
        .then(function (data) {
            if (
                data.candidates &&
                data.candidates[0] &&
                data.candidates[0].content &&
                data.candidates[0].content.parts &&
                data.candidates[0].content.parts[0]
            ) {
                return data.candidates[0].content.parts[0].text;
            }
            throw new Error('Réponse API inattendue');
        });
    }

    // ─── LANCEMENT ───────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
