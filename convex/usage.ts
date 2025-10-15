import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const FREE_REDESIGN_LIMIT = 3;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ATTEMPTS_PER_WINDOW = 5;

export const checkRedesignLimit = query({
  args: { 
    userId: v.string(),
    deviceId: v.optional(v.string()),
    deviceFingerprint: v.optional(v.string()),
    isAuthenticated: v.boolean(),
    isSubscribed: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    // For authenticated users, check their usage
    if (args.isAuthenticated) {
      const usage = await ctx.db
        .query("usageTracking")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();

      if (usage) {
        const isSubscribed = usage.isSubscribed || args.isSubscribed || false;
        const canRedesign = isSubscribed || usage.redesignCount < FREE_REDESIGN_LIMIT;
        const remainingRedesigns = isSubscribed ? -1 : Math.max(0, FREE_REDESIGN_LIMIT - usage.redesignCount);

        return {
          canRedesign,
          redesignCount: usage.redesignCount,
          remainingRedesigns,
          isSubscribed
        };
      }
    }

    // For anonymous users, check device-based limits
    if (args.deviceFingerprint) {
      const similarSessions = await ctx.db
        .query("deviceSessions")
        .withIndex("by_fingerprint", (q) => q.eq("deviceFingerprint", args.deviceFingerprint!))
        .collect();

      // Aggregate redesign count from all similar sessions
      const totalRedesigns = similarSessions.reduce((sum, session) => sum + session.redesignCount, 0);

      const canRedesign = totalRedesigns < FREE_REDESIGN_LIMIT;
      const remainingRedesigns = Math.max(0, FREE_REDESIGN_LIMIT - totalRedesigns);

      return {
        canRedesign,
        redesignCount: totalRedesigns,
        remainingRedesigns,
        isSubscribed: false
      };
    }

    // Default for new users
    return {
      canRedesign: true,
      redesignCount: 0,
      remainingRedesigns: FREE_REDESIGN_LIMIT,
      isSubscribed: false
    };
  },
});

export const updateDeviceSession = mutation({
  args: {
    deviceId: v.string(),
    deviceFingerprint: v.string(),
    userId: v.string(),
    isAuthenticated: v.boolean(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    let deviceSession = await ctx.db
      .query("deviceSessions")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (deviceSession) {
      await ctx.db.patch(deviceSession._id, {
        lastSeenAt: now,
        deviceId: args.deviceId,
        ipAddress: args.ipAddress,
        userAgent: args.userAgent
      });
    } else {
      await ctx.db.insert("deviceSessions", {
        deviceId: args.deviceId,
        deviceFingerprint: args.deviceFingerprint,
        userId: args.userId,
        isAuthenticated: args.isAuthenticated,
        redesignCount: 0,
        ipAddress: args.ipAddress,
        userAgent: args.userAgent,
        lastSeenAt: now,
        createdAt: now
      });
    }

    return { success: true };
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
    deviceId: v.string(),
    deviceFingerprint: v.string(),
    isAuthenticated: v.boolean(),
    isSubscribed: v.optional(v.boolean()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    if (args.isAuthenticated) {
      // Handle authenticated users
      const usage = await ctx.db
        .query("usageTracking")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();

      if (usage) {
        const isSubscribed = usage.isSubscribed || args.isSubscribed || false;
        
        if (!isSubscribed && usage.redesignCount >= FREE_REDESIGN_LIMIT) {
          throw new Error("Redesign limit reached. Please subscribe to continue.");
        }

        await ctx.db.patch(usage._id, {
          redesignCount: usage.redesignCount + 1,
          lastRedesignAt: now,
          updatedAt: now,
          deviceId: args.deviceId,
          deviceFingerprint: args.deviceFingerprint,
          ipAddress: args.ipAddress,
          userAgent: args.userAgent
        });
      } else {
        await ctx.db.insert("usageTracking", {
          userId: args.userId,
          deviceId: args.deviceId,
          deviceFingerprint: args.deviceFingerprint,
          isAuthenticated: args.isAuthenticated,
          redesignCount: 1,
          lastRedesignAt: now,
          isSubscribed: args.isSubscribed || false,
          ipAddress: args.ipAddress,
          userAgent: args.userAgent,
          createdAt: now,
          updatedAt: now
        });
      }
    } else {
      // Handle anonymous users with device tracking
      const similarSessions = await ctx.db
        .query("deviceSessions")
        .withIndex("by_fingerprint", (q) => q.eq("deviceFingerprint", args.deviceFingerprint))
        .collect();

      const totalRedesigns = similarSessions.reduce((sum, session) => sum + session.redesignCount, 0);
      
      if (totalRedesigns >= FREE_REDESIGN_LIMIT) {
        throw new Error("Redesign limit reached. Please sign up to continue.");
      }

      // Find or create device session
      let deviceSession = await ctx.db
        .query("deviceSessions")
        .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
        .first();

      if (deviceSession) {
        await ctx.db.patch(deviceSession._id, {
          redesignCount: deviceSession.redesignCount + 1,
          lastSeenAt: now,
          ipAddress: args.ipAddress,
          userAgent: args.userAgent
        });
      } else {
        await ctx.db.insert("deviceSessions", {
          deviceId: args.deviceId,
          deviceFingerprint: args.deviceFingerprint,
          userId: args.userId,
          isAuthenticated: false,
          redesignCount: 1,
          ipAddress: args.ipAddress,
          userAgent: args.userAgent,
          lastSeenAt: now,
          createdAt: now
        });
      }
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
        deviceId: "",
        deviceFingerprint: "",
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
