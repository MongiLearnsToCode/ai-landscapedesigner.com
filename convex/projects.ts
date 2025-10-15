import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createProject = mutation({
  args: {
    userId: v.string(),
    originalImageUrl: v.string(),
    originalImagePublicId: v.string(),
    styles: v.array(v.string()),
    allowStructuralChanges: v.boolean(),
    climateZone: v.string(),
    redesignDensity: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("projects", {
      ...args,
      createdAt: now,
      updatedAt: now
    });
  },
});

export const updateProjectWithRedesign = mutation({
  args: {
    projectId: v.id("projects"),
    redesignedImageUrl: v.string(),
    redesignedImagePublicId: v.string(),
    catalog: v.object({
      plants: v.array(v.object({
        name: v.string(),
        species: v.string()
      })),
      features: v.array(v.object({
        name: v.string(),
        description: v.string()
      }))
    })
  },
  handler: async (ctx, args) => {
    const { projectId, ...updates } = args;
    return await ctx.db.patch(projectId, {
      ...updates,
      updatedAt: Date.now()
    });
  },
});

export const getUserProjects = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const toggleProjectPin = mutation({
  args: {
    projectId: v.id("projects"),
    isPinned: v.boolean()
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.projectId, {
      isPinned: args.isPinned,
      updatedAt: Date.now()
    });
  },
});

export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.projectId);
  },
});
