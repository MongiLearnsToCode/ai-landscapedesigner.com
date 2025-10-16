import { ConvexReactClient } from "convex/react";
import { api } from "../convex/_generated/api";
import { uploadBase64ToCloudinary } from "./cloudinaryService";
import type { LandscapingStyle, DesignCatalog, RedesignDensity, ImageFile } from "../types";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface ProjectData {
  userId: string;
  originalImage: ImageFile;
  styles: LandscapingStyle[];
  allowStructuralChanges: boolean;
  climateZone: string;
  redesignDensity: RedesignDensity;
}

export interface RedesignResult {
  base64ImageBytes: string;
  mimeType: string;
  catalog: DesignCatalog;
}

export const saveProject = async (projectData: ProjectData): Promise<string> => {
  // Ensure original image is uploaded to Cloudinary
  if (!projectData.originalImage.cloudinaryUrl || !projectData.originalImage.cloudinaryPublicId) {
    throw new Error('Original image must be uploaded to Cloudinary first');
  }

  const projectId = await convex.mutation(api.projects.createProject, {
    userId: projectData.userId,
    originalImageUrl: projectData.originalImage.cloudinaryUrl,
    originalImagePublicId: projectData.originalImage.cloudinaryPublicId,
    styles: projectData.styles,
    allowStructuralChanges: projectData.allowStructuralChanges,
    climateZone: projectData.climateZone,
    redesignDensity: projectData.redesignDensity
  });

  return projectId;
};

export const saveRedesignResult = async (
  projectId: string,
  redesignResult: RedesignResult
): Promise<void> => {
  // Upload redesigned image to Cloudinary
  const cloudinaryResult = await uploadBase64ToCloudinary(
    redesignResult.base64ImageBytes,
    redesignResult.mimeType,
    'ai-landscape-designer/redesigns'
  );

  // Update project with redesign data
  await convex.mutation(api.projects.updateProjectWithRedesign, {
    projectId: projectId as any,
    redesignedImageUrl: cloudinaryResult.secure_url,
    redesignedImagePublicId: cloudinaryResult.public_id,
    catalog: redesignResult.catalog
  });
};

export const getUserProjects = async (userId: string) => {
  return await convex.query(api.projects.getUserProjects, { userId });
};

export const toggleProjectPin = async (projectId: string, isPinned: boolean) => {
  return await convex.mutation(api.projects.toggleProjectPin, {
    projectId: projectId as any,
    isPinned
  });
};

export const deleteProject = async (projectId: string) => {
  return await convex.mutation(api.projects.deleteProject, {
    projectId: projectId as any
  });
};
