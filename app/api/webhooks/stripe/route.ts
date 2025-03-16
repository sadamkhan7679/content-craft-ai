import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import {
  createOrUpdateSubscription,
  updateUserPoints,
} from "@/utils/db/actions";
import { findPriceById } from "@/data/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const reqHeaders = await headers();
  const signature = reqHeaders.get("Stripe-Signature") as string;

  if (!signature) {
    console.error("No Stripe signature found");
    return NextResponse.json({ error: "No Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  console.log(`Received event type: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const subscriptionId = session.subscription as string;

    if (!userId || !subscriptionId) {
      console.error("Missing userId or subscriptionId in session", { session });
      return NextResponse.json(
        { error: "Invalid session data" },
        { status: 400 }
      );
    }

    try {
      console.log(`Retrieving subscription: ${subscriptionId}`);
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log("Retrieved subscription:", subscription);

      if (!subscription.items.data.length) {
        console.error("No items found in subscription", { subscription });
        return NextResponse.json(
          { error: "Invalid subscription data" },
          { status: 400 }
        );
      }

      const priceId = subscription.items.data[0].price.id;
      console.log(`Price ID: ${priceId}`);

      const pricingPlan = findPriceById(priceId);

      if (!pricingPlan) {
        console.error("Unknown price ID", { priceId });
        return NextResponse.json(
          { error: "Unknown price ID" },
          { status: 400 }
        );
      }

      //   let plan: string;
      //   let pointsToAdd: number;

      //   // Map price IDs to plan names and points
      //   switch (priceId) {
      //     case "price_1PyFKGBibz3ZDixDAaJ3HO74":
      //       plan = "Basic";
      //       pointsToAdd = 100;
      //       break;
      //     case "price_1PyFN0Bibz3ZDixDqm9eYL8W":
      //       plan = "Pro";
      //       pointsToAdd = 500;
      //       break;
      //     default:
      //       console.error("Unknown price ID", { priceId });
      //       return NextResponse.json(
      //         { error: "Unknown price ID" },
      //         { status: 400 }
      //       );
      //   }

      console.log(`Creating/updating subscription for user ${userId}`);
      const updatedSubscription = await createOrUpdateSubscription(
        userId,
        subscriptionId,
        pricingPlan.name,
        "active",
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000)
      );

      if (!updatedSubscription) {
        console.error("Failed to create or update subscription");
        return NextResponse.json(
          { error: "Failed to create or update subscription" },
          { status: 500 }
        );
      }

      console.log(`Updating points for user ${userId}: +${pricingPlan.points}`);
      await updateUserPoints(userId, pricingPlan.points as number);

      console.log(`Successfully processed subscription for user ${userId}`);
    } catch (error: any) {
      console.error("Error processing subscription:", error);
      return NextResponse.json(
        { error: "Error processing subscription", details: error.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
