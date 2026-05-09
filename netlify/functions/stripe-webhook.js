'use strict';
const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const secret      = process.env.STRIPE_SECRET_KEY;
  const webhookSec  = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return { statusCode: 500, body: 'Config manquante' };

  const stripe = Stripe(secret);
  let stripeEvent;

  try {
    if (webhookSec) {
      const sig = event.headers['stripe-signature'];
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        sig,
        webhookSec
      );
    } else {
      stripeEvent = JSON.parse(event.body);
    }
  } catch (err) {
    console.error('[stripe-webhook] signature invalide:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    console.log('[stripe-webhook] paiement confirmé — client:', session.metadata?.client_name, '— email:', session.customer_email, '— montant:', session.amount_total / 100, session.currency.toUpperCase());
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
