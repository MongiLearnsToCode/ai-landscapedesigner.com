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

  usageTracking: defineTable({
    userId: v.string(), // Clerk user ID or anonymous session ID
    isAuthenticated: v.boolean(),
    redesignCount: v.number(),
    lastRedesignAt: v.optional(v.number()),
    isSubscribed: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_user", ["userId"]),

  rateLimiting: defineTable({
    userId: v.string(),
    action: v.string(), // "redesign", "upload"
    attempts: v.number(),
    windowStart: v.number(),
    lastAttemptAt: v.number()
  }).index("by_user_action", ["userId", "action"])
});
