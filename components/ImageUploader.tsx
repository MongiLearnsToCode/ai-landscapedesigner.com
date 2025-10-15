import React, { useState, useRef, useEffect } from 'react';
import type { ImageFile } from '../types';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { UploadCloud, X, Eye } from 'lucide-react';

interface ImageUploaderProps {
  onImageUpload: (file: ImageFile | null) => void;
  initialImage?: ImageFile | null;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MIN_ASPECT_RATIO = 1 / 3;
const MAX_ASPECT_RATIO = 3;

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, initialImage }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openModal } = useApp();
  const { addToast } = useToast();
  
  useEffect(() => {
    if (initialImage) {
      setPreview(initialImage.cloudinaryUrl || `data:${initialImage.type};base64,${initialImage.base64}`);
    } else {
      setPreview(null);
    }
  }, [initialImage]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    const resetInputAndToast = (message: string) => {
        addToast(message, 'error');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!file) return;

    if (!file.type.startsWith('image/')) {
        resetInputAndToast('Please select a valid image file (PNG, JPG, WEBP).');
        return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        resetInputAndToast(`Image size must not exceed ${MAX_FILE_SIZE_MB}MB.`);
        return;
    }

    // Validate aspect ratio
    const img = new Image();
    img.onload = async () => {
      const aspectRatio = img.width / img.height;
      if (aspectRatio < MIN_ASPECT_RATIO || aspectRatio > MAX_ASPECT_RATIO) {
        resetInputAndToast(
          'Image aspect ratio is too extreme. Please crop it to a more standard ratio (e.g., 4:3, 16:9) and try again.'
        );
        return;
      }

      // Upload to Cloudinary
      setIsUploading(true);
      try {
        const cloudinaryResult = await uploadToCloudinary(file);
        
        const imageFile: ImageFile = {
          name: file.name,
          type: file.type,
          base64: '', // Keep for backward compatibility
          cloudinaryUrl: cloudinaryResult.secure_url,
          cloudinaryPublicId: cloudinaryResult.public_id,
          width: cloudinaryResult.width,
          height: cloudinaryResult.height
        };

        setPreview(cloudinaryResult.secure_url);
        onImageUpload(imageFile);
        addToast('Image uploaded successfully!', 'success');
      } catch (error) {
        console.error('Upload failed:', error);
        resetInputAndToast('Failed to upload image. Please try again.');
      } finally {
        setIsUploading(false);
      }
    };
    
    img.onerror = () => {
      resetInputAndToast('Could not load the image file. It might be corrupted.');
    };
    
    img.src = URL.createObjectURL(file);
  };
  
  const handleRemoveImage = () => {
    setPreview(null);
    onImageUpload(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`relative w-full rounded-xl text-center transition-all duration-300 group
          ${!preview 
            ? 'h-56 border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/80 hover:border-slate-400 hover:bg-slate-100' 
            : 'border-0'
          }`
        }
        onClick={() => !preview && !isUploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
        aria-label="Upload an image of your outdoor space"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          disabled={isUploading}
        />
        {!preview ? (
          <div className="text-slate-500">
            <UploadCloud className="mx-auto h-12 w-12 text-slate-400 group-hover:text-slate-500 transition-colors" />
            <p className="mt-2 font-medium text-slate-700">
              {isUploading ? 'Uploading...' : 'Click to upload or drag & drop'}
            </p>
            <p className="text-xs">
              {isUploading ? 'Please wait...' : 'PNG, JPG, WEBP up to 10MB'}
            </p>
          </div>
        ) : (
          <div className="relative w-full rounded-xl overflow-hidden">
            <img src={preview} alt="Preview" className="w-full h-auto block" />
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl gap-2">
               <button onClick={(e) => { e.stopPropagation(); openModal(preview); }} className="bg-white/90 hover:bg-white text-slate-800 font-semibold px-3 py-2 rounded-lg text-sm shadow-md transition-all duration-200 flex items-center">
                 <Eye className="h-4 w-4 mr-1.5" />
                 View
               </button>
               <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }} className="bg-white/90 hover:bg-white text-red-600 font-semibold px-3 py-2 rounded-lg text-sm shadow-md transition-all duration-200 flex items-center">
                 <X className="h-4 w-4 mr-1.5" />
                 Remove
               </button>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-2 text-center">
        For best results, upload images without people or cars.
      </p>
    </div>
  );
};
