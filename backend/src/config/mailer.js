// src/config/mailer.js — Configuration Nodemailer
// -------------------------------------------------
// Centralise l'envoi d'emails transactionnels (réinitialisation mot de passe, etc.)
// Variables .env requises : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

const nodemailer = require('nodemailer');

// Transport SMTP configuré depuis les variables d'environnement
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465', // SSL sur le port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envoie un email.
 * @param {object} options - { to, subject, html }
 */
async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from:    `"NikeBasket" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

module.exports = { sendMail };
