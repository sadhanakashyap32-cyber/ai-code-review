export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })
  : null;

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object;

  try {
    switch (event.type) {
      case "checkout.session.completed":
        // Initial purchase completed
        if (session.metadata?.userId) {
          await prisma.user.update({
            where: { id: session.metadata.userId },
            data: {
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              plan: "PRO",
            },
          });
        }
        break;

      case "invoice.payment_succeeded":
        // Recurring payment succeeded, update current period end
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription
        );

        await prisma.user.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
              subscription.current_period_end * 1000
            ),
            plan: "PRO",
          },
        });
        break;

      case "customer.subscription.deleted":
        // Subscription cancelled or payment failed permanently
        await prisma.user.update({
          where: { stripeSubscriptionId: session.id },
          data: {
            plan: "FREE",
            stripeCurrentPeriodEnd: null,
          },
        });
        break;

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new NextResponse(`Webhook Processing Error`, { status: 500 });
  }
}
