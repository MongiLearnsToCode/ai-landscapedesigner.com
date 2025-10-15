import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createSubscription = mutation({
  args: {
    userId: v.string(),
    polarSubscriptionId: v.string(),
    status: v.string(),
    planName: v.string(),
    currentPeriodEnd: v.number()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now
      });
      return existing._id;
    } else {
      return await ctx.db.insert("subscriptions", {
        ...args,
        createdAt: now,
        updatedAt: now
      });
    }
  },
});

export const getUserSubscription = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

export const isUserSubscribed = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return !!subscription;
  },
});
