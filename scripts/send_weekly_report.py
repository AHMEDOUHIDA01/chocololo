import os
import smtplib
import ssl
from email.message import EmailMessage

DEFAULT_SUBJECT = "Premier rapport de la semaine - Chocololo"
DEFAULT_BODY = "Bonjour,\n\nVoici le premier rapport de cette semaine.\n\nCordialement,\nChocololo"


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def main() -> None:
    smtp_host = required_env("SMTP_HOST")
    smtp_port_raw = required_env("SMTP_PORT")
    try:
        smtp_port = int(smtp_port_raw)
    except ValueError as error:
        raise ValueError("SMTP_PORT must be a valid integer.") from error
    smtp_username = required_env("SMTP_USERNAME")
    smtp_password = required_env("SMTP_PASSWORD")
    recipient = required_env("REPORT_EMAIL_TO")
    sender = os.getenv("REPORT_EMAIL_FROM", "").strip() or smtp_username

    subject = os.getenv("REPORT_SUBJECT", "").strip() or DEFAULT_SUBJECT
    body = os.getenv("REPORT_BODY", "").strip() or DEFAULT_BODY

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(body)

    try:
        if smtp_port == 465:
            smtp_connection = smtplib.SMTP_SSL(
                smtp_host,
                smtp_port,
                timeout=30,
                context=ssl.create_default_context(),
            )
            tls_secured = True
        else:
            smtp_connection = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
            tls_secured = False
    except OSError as error:
        raise RuntimeError("Could not connect to SMTP server.") from error

    with smtp_connection as smtp:
        try:
            if not tls_secured:
                response_code, _ = smtp.starttls(context=ssl.create_default_context())
                if response_code != 220:
                    raise RuntimeError("STARTTLS was not accepted by the SMTP server.")
            smtp.login(smtp_username, smtp_password)
            smtp.send_message(message)
        except smtplib.SMTPAuthenticationError as error:
            raise RuntimeError("SMTP authentication failed. Check SMTP_USERNAME/SMTP_PASSWORD.") from error
        except smtplib.SMTPException as error:
            raise RuntimeError("Failed to send email through SMTP.") from error

    print("Weekly report email sent successfully.")


if __name__ == "__main__":
    main()
