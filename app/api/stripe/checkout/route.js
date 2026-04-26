import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20", // or latest
});

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If the user already has a Stripe customer ID and a Subscription, 
    // redirect them to the billing portal instead of checkout.
    if (user.stripeCustomerId && user.plan === "PRO") {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.NEXTAUTH_URL}/billing`,
      });

      return NextResponse.json({ url: stripeSession.url });
    }

    // Otherwise, create a Checkout Session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID, // Your specific Stripe Price ID
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXTAUTH_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/billing?canceled=true`,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      customer: user.stripeCustomerId || undefined,
      metadata: {
        userId: user.id, // Very important for the webhook
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        }
      }
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
