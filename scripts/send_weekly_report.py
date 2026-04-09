import os
import smtplib
from email.message import EmailMessage


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def main() -> None:
    smtp_host = required_env("SMTP_HOST")
    smtp_port = int(required_env("SMTP_PORT"))
    smtp_username = required_env("SMTP_USERNAME")
    smtp_password = required_env("SMTP_PASSWORD")
    recipient = required_env("REPORT_EMAIL_TO")
    sender = os.getenv("REPORT_EMAIL_FROM", "").strip() or smtp_username

    subject = os.getenv("REPORT_SUBJECT", "").strip() or "Premier rapport de la semaine - Chocololo"
    body = (
        os.getenv("REPORT_BODY", "").strip()
        or "Bonjour,\n\nVoici le premier rapport de cette semaine.\n\nCordialement,\nChocololo"
    )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(body)

    with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as smtp:
        smtp.starttls()
        smtp.login(smtp_username, smtp_password)
        smtp.send_message(message)

    print("Weekly report email sent successfully.")


if __name__ == "__main__":
    main()
