'use strict';
const Stripe = require('stripe');
const { json } = require('./lib/auth');

// Montant minimum Stripe en EUR : 50 centimes
const AMOUNT_CENTS = 50;
const CURRENCY     = 'eur';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Méthode non autorisée' });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return json(500, { error: 'Configuration paiement manquante' });

  let name, email, description;
  try {
    ({ name, email, description } = JSON.parse(event.body || '{}'));
  } catch { return json(400, { error: 'Corps invalide' }); }

  if (!name || !email) return json(400, { error: 'Nom et email requis' });

  const n = String(name).slice(0, 100).trim();
  const e = String(email).slice(0, 100).trim();
  const d = description ? String(description).slice(0, 200).trim() : 'Acompte WebCraft';

  const origin = event.headers?.origin || event.headers?.referer?.replace(/\/[^/]*$/, '') || 'https://harvey-web.fr';

  try {
    const stripe  = Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: e,
      line_items: [{
        price_data: {
          currency: CURRENCY,
          unit_amount: AMOUNT_CENTS,
          product_data: {
            name: d,
            description: `Client : ${n}`,
          },
        },
        quantity: 1,
      }],
      success_url: `${origin}/paiement-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/paiement.html?cancelled=1`,
      metadata: { client_name: n, client_email: e },
    });

    return json(200, { url: session.url });
  } catch (err) {
    console.error('[stripe] checkout session error:', err.message);
    return json(500, { error: 'Erreur lors de la création du paiement' });
  }
};
