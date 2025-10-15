import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const FREE_REDESIGN_LIMIT = 3;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ATTEMPTS_PER_WINDOW = 5;

export const checkRedesignLimit = query({
  args: { 
    userId: v.string(),
    isAuthenticated: v.boolean(),
    isSubscribed: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query("usageTracking")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!usage) {
      return {
        canRedesign: true,
        redesignCount: 0,
        remainingRedesigns: FREE_REDESIGN_LIMIT,
        isSubscribed: args.isSubscribed || false
      };
    }

    const isSubscribed = usage.isSubscribed || args.isSubscribed || false;
    const canRedesign = isSubscribed || usage.redesignCount < FREE_REDESIGN_LIMIT;
    const remainingRedesigns = isSubscribed ? -1 : Math.max(0, FREE_REDESIGN_LIMIT - usage.redesignCount);

    return {
      canRedesign,
      redesignCount: usage.redesignCount,
      remainingRedesigns,
      isSubscribed
    };
  },
});

export const checkRateLimit = query({
  args: { 
    userId: v.string(),
    action: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rateLimit = await ctx.db
      .query("rateLimiting")
      .withIndex("by_user_action", (q) => 
        q.eq("userId", args.userId).eq("action", args.action)
      )
      .first();

    if (!rateLimit) {
      return { allowed: true, attemptsRemaining: MAX_ATTEMPTS_PER_WINDOW };
    }

    // Reset window if expired
    if (now - rateLimit.windowStart > RATE_LIMIT_WINDOW) {
      return { allowed: true, attemptsRemaining: MAX_ATTEMPTS_PER_WINDOW };
    }

    const allowed = rateLimit.attempts < MAX_ATTEMPTS_PER_WINDOW;
    const attemptsRemaining = Math.max(0, MAX_ATTEMPTS_PER_WINDOW - rateLimit.attempts);

    return { allowed, attemptsRemaining };
  },
});

export const incrementRedesignCount = mutation({
  args: { 
    userId: v.string(),
    isAuthenticated: v.boolean(),
    isSubscribed: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check current usage
    const usage = await ctx.db
      .query("usageTracking")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (usage) {
      const isSubscribed = usage.isSubscribed || args.isSubscribed || false;
      
      // Prevent increment if limit reached and not subscribed
      if (!isSubscribed && usage.redesignCount >= FREE_REDESIGN_LIMIT) {
        throw new Error("Redesign limit reached. Please subscribe to continue.");
      }

      await ctx.db.patch(usage._id, {
        redesignCount: usage.redesignCount + 1,
        lastRedesignAt: now,
        updatedAt: now,
        isSubscribed: args.isSubscribed || usage.isSubscribed
      });
    } else {
      await ctx.db.insert("usageTracking", {
        userId: args.userId,
        isAuthenticated: args.isAuthenticated,
        redesignCount: 1,
        lastRedesignAt: now,
        isSubscribed: args.isSubscribed || false,
        createdAt: now,
        updatedAt: now
      });
    }

    return { success: true };
  },
});

export const incrementRateLimit = mutation({
  args: { 
    userId: v.string(),
    action: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const rateLimit = await ctx.db
      .query("rateLimiting")
      .withIndex("by_user_action", (q) => 
        q.eq("userId", args.userId).eq("action", args.action)
      )
      .first();

    if (rateLimit) {
      // Reset if window expired
      if (now - rateLimit.windowStart > RATE_LIMIT_WINDOW) {
        await ctx.db.patch(rateLimit._id, {
          attempts: 1,
          windowStart: now,
          lastAttemptAt: now
        });
      } else {
        await ctx.db.patch(rateLimit._id, {
          attempts: rateLimit.attempts + 1,
          lastAttemptAt: now
        });
      }
    } else {
      await ctx.db.insert("rateLimiting", {
        userId: args.userId,
        action: args.action,
        attempts: 1,
        windowStart: now,
        lastAttemptAt: now
      });
    }

    return { success: true };
  },
});

export const updateSubscriptionStatus = mutation({
  args: { 
    userId: v.string(),
    isSubscribed: v.boolean()
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query("usageTracking")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (usage) {
      await ctx.db.patch(usage._id, {
        isSubscribed: args.isSubscribed,
        updatedAt: Date.now()
      });
    } else {
      await ctx.db.insert("usageTracking", {
        userId: args.userId,
        isAuthenticated: true,
        redesignCount: 0,
        isSubscribed: args.isSubscribed,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    return { success: true };
  },
});
