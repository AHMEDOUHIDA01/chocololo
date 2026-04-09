# Chocololo

## Envoi automatique du rapport hebdomadaire par e-mail

Le dépôt inclut un workflow GitHub Actions qui envoie le **premier rapport de la semaine** chaque **lundi à 09:20 (UTC)**.

### Fichier workflow

- `/home/runner/work/chocololo/chocololo/.github/workflows/weekly-report-email.yml`

### Secrets GitHub requis

Configure ces secrets dans **Settings > Secrets and variables > Actions** :

- `SMTP_HOST` : serveur SMTP (ex: `smtp.gmail.com`)
- `SMTP_PORT` : port SMTP (ex: `587`)
- `SMTP_USERNAME` : identifiant SMTP
- `SMTP_PASSWORD` : mot de passe/app password SMTP
- `REPORT_EMAIL_TO` : destinataire du rapport
- `REPORT_EMAIL_FROM` *(optionnel)* : expéditeur; sinon `SMTP_USERNAME` est utilisé

### Personnalisation optionnelle (Variables Actions)

- `REPORT_SUBJECT` : sujet de l’e-mail
- `REPORT_BODY` : contenu texte de l’e-mail

### Exécution manuelle

Le workflow peut aussi être lancé manuellement via **Actions > Weekly report email > Run workflow**.
