import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    userId: v.string(),
    title: v.optional(v.string()),
    originalImageUrl: v.string(),
    originalImagePublicId: v.string(),
    redesignedImageUrl: v.optional(v.string()),
    redesignedImagePublicId: v.optional(v.string()),
    styles: v.array(v.string()),
    allowStructuralChanges: v.boolean(),
    climateZone: v.string(),
    redesignDensity: v.string(),
    catalog: v.optional(v.object({
      plants: v.array(v.object({
        name: v.string(),
        species: v.string()
      })),
      features: v.array(v.object({
        name: v.string(),
        description: v.string()
      }))
    })),
    isPinned: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_user", ["userId"]).index("by_user_created", ["userId", "createdAt"]),

  subscriptions: defineTable({
    userId: v.string(),
    polarSubscriptionId: v.string(),
    status: v.string(),
    planName: v.string(),
    currentPeriodEnd: v.number(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_user", ["userId"]).index("by_polar_id", ["polarSubscriptionId"]),

  usageTracking: defineTable({
    userId: v.string(), // Clerk user ID or anonymous session ID
    deviceId: v.optional(v.string()), // Device fingerprint
    deviceFingerprint: v.optional(v.string()), // Extended fingerprint for verification
    isAuthenticated: v.boolean(),
    redesignCount: v.number(),
    lastRedesignAt: v.optional(v.number()),
    isSubscribed: v.optional(v.boolean()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_user", ["userId"])
    .index("by_device", ["deviceId"])
    .index("by_fingerprint", ["deviceFingerprint"]),

  deviceSessions: defineTable({
    deviceId: v.string(),
    deviceFingerprint: v.string(),
    userId: v.string(),
    isAuthenticated: v.boolean(),
    redesignCount: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    lastSeenAt: v.number(),
    createdAt: v.number()
  }).index("by_device", ["deviceId"])
    .index("by_fingerprint", ["deviceFingerprint"])
    .index("by_device_fingerprint", ["deviceId", "deviceFingerprint"]),

  rateLimiting: defineTable({
    userId: v.string(),
    action: v.string(), // "redesign", "upload"
    attempts: v.number(),
    windowStart: v.number(),
    lastAttemptAt: v.number()
  }).index("by_user_action", ["userId", "action"])
});
