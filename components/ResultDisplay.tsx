import React from 'react';
import { DesignCatalog } from './DesignCatalog';
import type { DesignCatalog as DesignCatalogType, ImageFile, HistoryItem } from '../types';
import { Download, Share2, Expand, PenSquare, Wand, Image as ImageIcon, Layout as LayoutIcon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { EngagingLoader } from './EngagingLoader';
import { HistoryGallery } from './HistoryGallery';

interface ResultDisplayProps {
  originalImageFile: ImageFile | null;
  redesignedImage: string | null;
  designCatalog: DesignCatalogType | null;
  isLoading: boolean;
  onEdit?: () => void;
  onCustomize?: () => void;
  onPlanLayout?: () => void;
  historyItems?: HistoryItem[];
  onHistoryItemClick?: (item: HistoryItem) => void;
}

const ImageCard: React.FC<{ title: string; imageUrl: string; catalog: DesignCatalogType | null; onEdit?: () => void; onCustomize?: () => void; onPlanLayout?: () => void; }> = ({ title, imageUrl, catalog, onEdit, onCustomize, onPlanLayout }) => {
    const { openModal } = useApp();
    const { addToast } = useToast();

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        const fileExtension = imageUrl.split(';')[0].split('/')[1] || 'png';
        link.download = `redesigned-landscape.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast("Image download started!", "success");
    };
    
    const handleShare = async () => {
        try {
            // Step 1: Fetch the image data URL and convert it into a Blob, then a File object.
            // This is necessary for both the Web Share API and the Clipboard API.
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const fileExtension = blob.type.split('/')[1] || 'png';
            const file = new File([blob], `redesigned-landscape.${fileExtension}`, { type: blob.type });

            // Step 2: Attempt to use the Web Share API (Primary Method).
            // This provides the best user experience on supported devices (mostly mobile).
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'AI Landscape Redesign',
                    text: 'Check out this landscape design I created with the AI Redesigner!',
                    files: [file],
                });
                return; // Sharing was successful, so we're done.
            }
            
            // Step 3: If Web Share is unavailable, fall back to the Clipboard API.
            // This allows users on modern desktop browsers to copy the image directly.
            if (navigator.clipboard && navigator.clipboard.write && (window as any).ClipboardItem) {
                try {
                    const clipboardItem = new ClipboardItem({ [blob.type]: blob });
                    await navigator.clipboard.write([clipboardItem]);
                    addToast('Image copied to clipboard!', 'success');
                    return; // Copying was successful, so we're done.
                } catch (copyError) {
                    console.error('Clipboard copy failed, proceeding to final fallback:', copyError);
                    // If copying fails (e.g., user denies permission), we continue to the last resort.
                }
            }

            // Step 4: Final fallback for browsers that support neither method.
            // Inform the user that they need to download the image to share it.
            addToast('Sharing not available. Please download the image to share it.', 'info');

        } catch (err) {
            console.error('Error sharing/copying:', err);
            // Don't show an error toast if the user simply cancels the native share dialog.
            if ((err as Error).name !== 'AbortError') {
                 addToast('An error occurred while preparing the image for sharing.', 'error');
            }
        }
    };
    
    const ActionButton: React.FC<{ onClick: () => void; label: string; icon: React.ReactNode, 'aria-label': string }> = ({ onClick, label, icon, 'aria-label': ariaLabel }) => (
        <button
            onClick={onClick}
            className="bg-white/90 hover:bg-white text-slate-800 font-semibold px-4 py-2 rounded-lg text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center"
            aria-label={ariaLabel}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 xl:h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            </div>
            <div className="relative group w-full rounded-xl overflow-hidden bg-slate-100">
                <img src={imageUrl} alt={title} className="w-full h-auto block" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 sm:gap-4 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex-wrap rounded-xl">
                    <ActionButton onClick={() => openModal(imageUrl)} label="Larger" icon={<Expand className="h-4 w-4 mr-2" />} aria-label="View larger" />
                    {onPlanLayout && <ActionButton onClick={onPlanLayout} label="Plan Layout" icon={<LayoutIcon className="h-4 w-4 mr-2" />} aria-label="Plan layout" />}
                    {onCustomize && <ActionButton onClick={onCustomize} label="Customize" icon={<Wand className="h-4 w-4 mr-2" />} aria-label="Customize image" />}
                    {onEdit && <ActionButton onClick={onEdit} label="Edit" icon={<PenSquare className="h-4 w-4 mr-2" />} aria-label="Edit image" />}
                    <ActionButton onClick={handleDownload} label="Download" icon={<Download className="h-4 w-4 mr-2" />} aria-label="Download image" />
                    <ActionButton onClick={handleShare} label="Share" icon={<Share2 className="h-4 w-4 mr-2" />} aria-label="Share image" />
                </div>
            </div>
            {catalog && <DesignCatalog catalog={catalog} />}
        </div>
    );
};

const Placeholder: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex items-center justify-center min-h-[400px] w-full xl:min-h-0 xl:h-full">
        <div className="text-center text-slate-500">
            {children}
        </div>
    </div>
);


export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  originalImageFile,
  redesignedImage,
  designCatalog,
  isLoading,
  onEdit,
  onCustomize,
  onPlanLayout,
  historyItems,
  onHistoryItemClick,
}) => {
  if (isLoading) {
    return <EngagingLoader />;
  }
  
  if (redesignedImage) {
      return <ImageCard title="Design Preview" imageUrl={redesignedImage} catalog={designCatalog} onEdit={onEdit} onCustomize={onCustomize} onPlanLayout={onPlanLayout} />;
  }

  if (historyItems && historyItems.length > 0 && onHistoryItemClick) {
    return <HistoryGallery items={historyItems} onItemClick={onHistoryItemClick} />;
  }

  const PlaceholderContent = !originalImageFile ? (
    <>
      <ImageIcon className="mx-auto h-16 w-16 text-slate-300" strokeWidth={1}/>
      <h3 className="mt-4 text-xl font-semibold text-slate-700">Your design will appear here</h3>
      <p className="mt-1 text-sm text-slate-500">Upload an image and select a style to get started.</p>
    </>
  ) : (
    <>
      <Wand className="mx-auto h-16 w-16 text-slate-400" strokeWidth={1} />
      <h3 className="mt-4 text-xl font-semibold text-slate-700">Ready to Redesign</h3>
      <p className="mt-1 text-sm text-slate-500">{'Click "Generate Redesign" to see the magic happen.'}</p>
    </>
  );

  return (
      <Placeholder>
        {PlaceholderContent}
      </Placeholder>
  );
};
