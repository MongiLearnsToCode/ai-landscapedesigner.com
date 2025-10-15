import React, { useState, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ImageUploader } from '../components/ImageUploader';
import { StyleSelector } from '../components/StyleSelector';
import { ClimateSelector } from '../components/ClimateSelector';
import { ResultDisplay } from '../components/ResultDisplay';
import { UpgradeModal } from '../components/UpgradeModal';
import { UsageDisplay } from '../components/UsageDisplay';
import { redesignOutdoorSpace, refineRedesign, getElementImage } from '../services/geminiService';
import { convertImageToBase64 } from '../services/cloudinaryService';
import { saveProject, saveRedesignResult } from '../services/projectService';
import { checkRedesignLimit, checkRateLimit, incrementRedesignCount, incrementRateLimit } from '../services/usageService';
import { LANDSCAPING_STYLES } from '../constants';
import type { LandscapingStyle, ImageFile, DesignCatalog, RefinementModifications, RedesignDensity, Feature } from '../types';
import { useApp } from '../contexts/AppContext';
import { useHistory } from '../contexts/HistoryContext';
import { useToast } from '../contexts/ToastContext';
import { EditingModal } from '../components/EditingModal';
import { CustomizationModal } from '../components/CustomizationModal';
import { DensitySelector } from '../components/DensitySelector';
import { DrawingModal } from '../components/DrawingModal';
import { Layout } from 'lucide-react';
import confetti from 'canvas-confetti';

// Define the shape of the state we want to persist
interface DesignerState {
  originalImage: ImageFile | null;
  selectedStyles: LandscapingStyle[];
  allowStructuralChanges: boolean;
  climateZone: string;
  lockAspectRatio: boolean;
  redesignDensity: RedesignDensity;
}

const getInitialState = (): DesignerState => {
  try {
    const savedState = localStorage.getItem('designerSession');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      // Backwards compatibility for old state with `selectedStyle`
      if (parsed.selectedStyle && !parsed.selectedStyles) {
        parsed.selectedStyles = [parsed.selectedStyle];
        delete parsed.selectedStyle;
      }
      return {
        lockAspectRatio: true,
        redesignDensity: 'default',
        ...parsed,
        // Ensure selectedStyles exists and is not an empty array after parsing
        selectedStyles: (parsed.selectedStyles && parsed.selectedStyles.length > 0) ? parsed.selectedStyles : [LANDSCAPING_STYLES[0].id],
      };
    }
    // FIX: Added curly braces to the catch block to fix a syntax error.
  } catch (error) {
    console.error("Could not parse designer session state from localStorage", error);
  }
  return {
    originalImage: null,
    selectedStyles: [LANDSCAPING_STYLES[0].id],
    allowStructuralChanges: false,
    climateZone: '',
    lockAspectRatio: true,
    redesignDensity: 'default',
  };
};

export const DesignerPage: React.FC = () => {
  const { user } = useUser();
  const { itemToLoad, onItemLoaded, shouldTriggerConfetti, onConfettiTriggered } = useApp();
  const { saveNewRedesign, history, viewFromHistory } = useHistory();
  const { addToast } = useToast();

  const [designerState, setDesignerState] = useState<DesignerState>(getInitialState);
  const { originalImage, selectedStyles, allowStructuralChanges, climateZone, lockAspectRatio, redesignDensity } = designerState;

  const [redesignedImage, setRedesignedImage] = useState<string | null>(null);
  const [designCatalog, setDesignCatalog] = useState<DesignCatalog | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [drawingBackgroundImage, setDrawingBackgroundImage] = useState<string | null>(null);
  const [drawingOnSave, setDrawingOnSave] = useState<() => (overlay: string) => void>(() => () => {});
  const [layoutOverlayImage, setLayoutOverlayImage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Usage tracking state
  const [usageStatus, setUsageStatus] = useState({
    canRedesign: true,
    redesignCount: 0,
    remainingRedesigns: 3,
    isSubscribed: false
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check usage limits on component mount and user change
  useEffect(() => {
    const checkUsage = async () => {
      try {
        const status = await checkRedesignLimit(user?.id, false); // TODO: Check actual subscription status
        setUsageStatus(status);
      } catch (error) {
        console.error('Failed to check usage limits:', error);
      }
    };

    checkUsage();
  }, [user?.id]);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('designerSession', JSON.stringify(designerState));
  }, [designerState]);
  
  // Load item from history
  useEffect(() => {
    if (itemToLoad) {
      const newState: DesignerState = {
        originalImage: itemToLoad.originalImage,
        selectedStyles: itemToLoad.styles,
        allowStructuralChanges: false, // This is not saved in history, default to false
        climateZone: itemToLoad.climateZone,
        lockAspectRatio: true, // Not saved in history, default to true for quality
        redesignDensity: 'default', // Not saved, default
      };
      setDesignerState(newState);
      setRedesignedImage(itemToLoad.redesignedImage);
      setDesignCatalog(itemToLoad.designCatalog);
      setError(null);
      setLayoutOverlayImage(null); // Clear layout when loading from history
      onItemLoaded();
    }
  }, [itemToLoad, onItemLoaded]);

  // Trigger confetti when arriving from success page
  useEffect(() => {
    if (shouldTriggerConfetti) {
      const triggerConfetti = () => {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      };
      
      // Delay to ensure page is rendered
      const timer = setTimeout(triggerConfetti, 300);
      onConfettiTriggered();
      
      return () => clearTimeout(timer);
    }
  }, [shouldTriggerConfetti, onConfettiTriggered]);

  const updateState = (updates: Partial<DesignerState>) => {
    setDesignerState(prevState => ({ ...prevState, ...updates }));
  };

  const handleImageUpload = (file: ImageFile | null) => {
    updateState({ originalImage: file });
    setRedesignedImage(null);
    setDesignCatalog(null);
    setError(null);
    setLayoutOverlayImage(null); // Reset layout plan on new image upload
  };

  const openPreDesignDrawer = () => {
    if (!originalImage) return;
    setDrawingBackgroundImage(`data:${originalImage.type};base64,${originalImage.base64}`);
    setDrawingOnSave(() => (overlay: string) => {
        setLayoutOverlayImage(overlay);
        setIsDrawingModalOpen(false);
    });
    setIsDrawingModalOpen(true);
  };

  const openPostDesignDrawer = () => {
    if (!redesignedImage) return;
    setDrawingBackgroundImage(redesignedImage);
    setDrawingOnSave(() => (overlay: string) => {
        setIsDrawingModalOpen(false);
        handleRefineWithLayout(overlay);
    });
    setIsDrawingModalOpen(true);
  };

  const handleGenerateRedesign = useCallback(async () => {
    if (!originalImage) {
      setError("Please upload an image first.");
      return;
    }

    // Check usage limits
    try {
      const currentUsage = await checkRedesignLimit(user?.id, usageStatus.isSubscribed);
      setUsageStatus(currentUsage);
      
      if (!currentUsage.canRedesign) {
        setShowUpgradeModal(true);
        return;
      }
    } catch (error) {
      setError("Failed to check usage limits. Please try again.");
      return;
    }

    // Check rate limits
    try {
      const rateCheck = await checkRateLimit(user?.id, 'redesign');
      if (!rateCheck.allowed) {
        setError("Too many requests. Please wait a moment before trying again.");
        return;
      }
    } catch (error) {
      setError("Rate limit check failed. Please try again.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setRedesignedImage(null);
    setDesignCatalog(null);

    let projectId: string | null = null;

    try {
      // Increment rate limit counter
      await incrementRateLimit(user?.id, 'redesign');

      // Save project to Convex first (only for authenticated users)
      if (user) {
        projectId = await saveProject({
          userId: user.id,
          originalImage: originalImage,
          styles: selectedStyles,
          allowStructuralChanges,
          climateZone,
          redesignDensity
        });
      }

      // Convert Cloudinary URL to base64 if needed
      let imageBase64 = originalImage.base64;
      let imageMimeType = originalImage.type;
      
      if (originalImage.cloudinaryUrl && !originalImage.base64) {
        const converted = await convertImageToBase64(originalImage.cloudinaryUrl);
        imageBase64 = converted.base64;
        imageMimeType = converted.mimeType;
      }

      const result = await redesignOutdoorSpace(
        imageBase64,
        imageMimeType,
        selectedStyles,
        allowStructuralChanges,
        climateZone,
        lockAspectRatio,
        redesignDensity,
        layoutOverlayImage
      );

      // Increment usage count after successful generation
      await incrementRedesignCount(user?.id, usageStatus.isSubscribed);
      
      // Update local usage status
      const updatedUsage = await checkRedesignLimit(user?.id, usageStatus.isSubscribed);
      setUsageStatus(updatedUsage);

      // Save redesign result to Cloudinary and update project (authenticated users only)
      if (projectId) {
        await saveRedesignResult(projectId, result);
      }
      
      // Save to local history for backward compatibility
      await saveNewRedesign({
        originalImage: originalImage,
        redesignedImage: { base64: result.base64ImageBytes, type: result.mimeType },
        catalog: result.catalog,
        styles: selectedStyles,
        climateZone: climateZone,
      });

      setRedesignedImage(`data:${result.mimeType};base64,${result.base64ImageBytes}`);
      setDesignCatalog(result.catalog);
      
      // Clear session so a refresh doesn't show the old inputs
      localStorage.removeItem('designerSession');
      setLayoutOverlayImage(null);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      console.error("Redesign failed:", errorMessage);
      setError(`Failed to generate redesign. ${errorMessage}.`);
      addToast(`Redesign failed: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, selectedStyles, allowStructuralChanges, climateZone, lockAspectRatio, redesignDensity, saveNewRedesign, addToast, layoutOverlayImage]);

  const handleRefineWithLayout = useCallback(async (layoutOverlay: string) => {
    if (!redesignedImage || !designCatalog || !originalImage) {
      addToast("Cannot refine without an existing design.", "error");
      return;
    }
    setIsLoading(true);
    setError(null);
    addToast("Refining layout...", "info");
    
    try {
      const [header, base64Data] = redesignedImage.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';

      const result = await refineRedesign(
        base64Data, 
        mimeType, 
        { deletions: [], replacements: [], additions: [] },
        layoutOverlay
      );

      await saveNewRedesign({
        originalImage: originalImage,
        redesignedImage: { base64: result.base64ImageBytes, type: result.mimeType },
        catalog: designCatalog, // Catalog does not change with layout refinement
        styles: selectedStyles,
        climateZone: climateZone,
      });

      setRedesignedImage(`data:${result.mimeType};base64,${result.base64ImageBytes}`);
      addToast('Layout refined successfully!', 'success');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      console.error("Layout refinement failed:", errorMessage);
      setError(`Failed to refine layout. ${errorMessage}.`);
      addToast(`Refinement failed: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [redesignedImage, designCatalog, originalImage, saveNewRedesign, addToast, selectedStyles, climateZone]);

  const handleSaveEdit = (newImageUrl: string) => {
    setRedesignedImage(newImageUrl);
  };
  
  const handleSaveCustomization = useCallback(async (
    modifications: RefinementModifications,
    newAdditions: { name: string; description: string }[]
  ) => {
    setIsCustomizing(false);
    if (!redesignedImage || !designCatalog) {
        addToast("Cannot refine without an existing design and catalog.", "error");
        return;
    }

    const hasTextChanges = modifications.deletions.length > 0 || modifications.replacements.length > 0 || modifications.additions.length > 0;
    
    if (!hasTextChanges) {
        addToast("No customizations were applied.", "info");
        return;
    }

    setIsLoading(true);
    setError(null);
    addToast("Refining your design...", "info");

    try {
        let updatedCatalog = { ...designCatalog, features: [...designCatalog.features] };

        // Step 1: Generate images for new additions and update the catalog
        if (newAdditions.length > 0) {
            addToast(`Generating images for ${newAdditions.length} new item(s)...`, "info");
            const newFeaturesPromises = newAdditions.map(async (addition) => {
                const imageUrl = await getElementImage(addition.name, addition.description);
                const newFeature: Feature = {
                    name: addition.name,
                    description: addition.description,
                    imageUrl,
                };
                return newFeature;
            });
            const newFeatures = await Promise.all(newFeaturesPromises);
            updatedCatalog.features.push(...newFeatures);
        }

        // Step 2: Call Gemini to refine the main landscape image
        const [header, base64Data] = redesignedImage.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';

        const result = await refineRedesign(base64Data, mimeType, modifications, null);
        
        if (!originalImage) throw new Error("Original image not found for saving history.");

        // Step 3: Save the refined version as a new history item with the updated catalog
        await saveNewRedesign({
            originalImage: originalImage,
            redesignedImage: { base64: result.base64ImageBytes, type: result.mimeType },
            catalog: updatedCatalog,
            styles: selectedStyles,
            climateZone: climateZone,
        });

        setRedesignedImage(`data:${result.mimeType};base64,${result.base64ImageBytes}`);
        setDesignCatalog(updatedCatalog);
        addToast('Design refined successfully!', 'success');

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        console.error("Refinement failed:", errorMessage);
        setError(`Failed to refine design. ${errorMessage}.`);
        addToast(`Refinement failed: ${errorMessage}`, 'error');
    } finally {
        setIsLoading(false);
    }
  }, [redesignedImage, originalImage, designCatalog, saveNewRedesign, addToast, selectedStyles, climateZone]);


  const Section: React.FC<{title: string, children: React.ReactNode}> = ({title, children}) => (
    <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">{title}</h2>
        {children}
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 xl:items-start gap-8">
      <div className="xl:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-6 h-fit">
        <Section title="Upload Your Space">
            <ImageUploader onImageUpload={handleImageUpload} initialImage={originalImage} />
            {originalImage && (
              <div className="mt-4">
                  <button
                      onClick={openPreDesignDrawer}
                      className="w-full h-11 flex items-center justify-center gap-2 bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors border border-slate-200/80"
                  >
                      <Layout className="h-4 w-4" />
                      {layoutOverlayImage ? 'Edit Layout Plan' : 'Plan Driveway & Paths'}
                  </button>
                  {layoutOverlayImage && <p className="text-xs text-green-600 text-center mt-2">✓ Layout plan saved.</p>}
              </div>
            )}
        </Section>
        
        <Section title="Choose Your Style">
            <StyleSelector
                selectedStyles={selectedStyles}
                onStylesChange={(styles) => updateState({ selectedStyles: styles })}
                allowStructuralChanges={allowStructuralChanges}
                onAllowStructuralChanges={(allow) => updateState({ allowStructuralChanges: allow })}
                lockAspectRatio={lockAspectRatio}
                onLockAspectRatioChange={(lock) => updateState({ lockAspectRatio: lock })}
            />
        </Section>

        <Section title="Specify Details">
            <ClimateSelector value={climateZone} onChange={(val) => updateState({ climateZone: val })} />
        </Section>

        <Section title="Set Redesign Density">
            <DensitySelector value={redesignDensity} onChange={(val) => updateState({ redesignDensity: val })} />
        </Section>
        
        {/* Usage Display */}
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <UsageDisplay
            redesignCount={usageStatus.redesignCount}
            remainingRedesigns={usageStatus.remainingRedesigns}
            isSubscribed={usageStatus.isSubscribed}
          />
        </div>
        
        <div>
            <button
              onClick={handleGenerateRedesign}
              disabled={!originalImage || isLoading || !usageStatus.canRedesign}
              className="w-full h-11 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {redesignedImage ? 'Refining...' : 'Redesigning...'}
                </>
              ) : !usageStatus.canRedesign ? (
                'Upgrade to Continue'
              ) : (
                'Generate Redesign'
              )}
            </button>
        </div>
         {error && <p className="text-red-600 text-sm mt-2 text-center">{error}</p>}
      </div>
      
      <div className="xl:col-span-2 flex flex-col">
        <ResultDisplay
          originalImageFile={originalImage}
          redesignedImage={redesignedImage}
          designCatalog={designCatalog}
          isLoading={isLoading}
          onEdit={() => setIsEditing(true)}
          onCustomize={() => setIsCustomizing(true)}
          onPlanLayout={openPostDesignDrawer}
          historyItems={history}
          onHistoryItemClick={viewFromHistory}
        />
      </div>
      {isEditing && redesignedImage && (
        <EditingModal
            isOpen={isEditing}
            onClose={() => setIsEditing(false)}
            imageUrl={redesignedImage}
            onSave={handleSaveEdit}
        />
      )}
      {isCustomizing && redesignedImage && designCatalog &&(
        <CustomizationModal
          isOpen={isCustomizing}
          onClose={() => setIsCustomizing(false)}
          imageUrl={redesignedImage}
          onSave={handleSaveCustomization}
          designCatalog={designCatalog}
          styles={selectedStyles}
          climateZone={climateZone}
        />
      )}
      {isDrawingModalOpen && drawingBackgroundImage && (
        <DrawingModal
            isOpen={isDrawingModalOpen}
            onClose={() => setIsDrawingModalOpen(false)}
            backgroundImageUrl={drawingBackgroundImage}
            onSave={drawingOnSave}
        />
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        redesignCount={usageStatus.redesignCount}
        remainingRedesigns={usageStatus.remainingRedesigns}
      />
    </div>
  );
};
