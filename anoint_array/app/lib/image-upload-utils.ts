
export interface UploadResult {
  success: boolean;
  url?: string;
  cloudStoragePath?: string;
  error?: string;
}

export interface ProductImageData {
  imageUrl: string;
  imageGallery: string[];
}

// Enhanced image upload with verification
export async function uploadImageWithVerification(
  file: File, 
  index: number
): Promise<UploadResult> {
  console.log(`🔄 Starting verified upload for index ${index}:`, {
    name: file.name,
    size: file.size,
    type: file.type
  });

  try {
    // Step 1: Upload the image
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('type', 'product-image');

    console.log(`📤 Sending upload request for index ${index}`);
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: uploadFormData,
    });

    console.log(`📥 Upload response for index ${index}:`, uploadResponse.status, uploadResponse.statusText);

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      console.error(`❌ Upload failed for index ${index}:`, error);
      return { 
        success: false, 
        error: error.error || `Upload failed with status ${uploadResponse.status}` 
      };
    }

    const uploadData = await uploadResponse.json();
    console.log(`✅ Upload successful for index ${index}:`, uploadData);

    // Step 2: Verify the uploaded image is accessible
    console.log(`🔍 Verifying image accessibility for ${uploadData.url}`);
    const verifyResponse = await fetch(uploadData.url, { method: 'HEAD' });
    
    if (!verifyResponse.ok) {
      console.error(`❌ Image verification failed for ${uploadData.url}:`, verifyResponse.status);
      return { 
        success: false, 
        error: `Image uploaded but not accessible (status: ${verifyResponse.status})` 
      };
    }

    console.log(`✅ Image verified accessible at ${uploadData.url}`);

    // Step 3: Double-check by trying to fetch image metadata
    const contentType = verifyResponse.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      console.error(`❌ Invalid content type: ${contentType}`);
      return { 
        success: false, 
        error: `Uploaded file is not an image (content-type: ${contentType})` 
      };
    }

    console.log(`✅ Image verification complete for index ${index}`);

    return {
      success: true,
      url: uploadData.url,
      cloudStoragePath: uploadData.cloudStoragePath
    };

  } catch (error) {
    console.error(`❌ Upload error for index ${index}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error during upload'
    };
  }
}

// Verify all images in the gallery are accessible
export async function verifyImageGallery(imageGallery: string[]): Promise<{
  valid: boolean;
  errors: string[];
  validImages: string[];
}> {
  console.log('🔍 Verifying image gallery:', imageGallery);
  
  const results = await Promise.all(
    imageGallery.map(async (url, index) => {
      if (!url || url.trim() === '') {
        return { index, valid: false, error: 'Empty URL', url };
      }

      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`✅ Image ${index + 1} verified: ${url}`);
          return { index, valid: true, url };
        } else {
          console.error(`❌ Image ${index + 1} not accessible: ${url} (status: ${response.status})`);
          return { index, valid: false, error: `Not accessible (${response.status})`, url };
        }
      } catch (error) {
        console.error(`❌ Image ${index + 1} verification error: ${url}`, error);
        return { index, valid: false, error: 'Network error', url };
      }
    })
  );

  const errors: string[] = [];
  const validImages: string[] = [];

  results.forEach(result => {
    if (result.valid) {
      validImages.push(result.url);
    } else {
      errors.push(`Image ${result.index + 1}: ${result.error}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    validImages
  };
}

// Confirm product was saved with images in database
export async function confirmProductSavedWithImages(productId: string): Promise<{
  success: boolean;
  imageData?: ProductImageData;
  error?: string;
}> {
  try {
    console.log(`🔍 Confirming product ${productId} saved with images`);
    
    const response = await fetch(`/api/products/${productId}?admin=true`);
    
    if (!response.ok) {
      return { 
        success: false, 
        error: `Failed to fetch product: ${response.status}` 
      };
    }

    const product = await response.json();
    console.log(`✅ Product fetched from database:`, {
      id: product.id,
      imageUrl: product.imageUrl,
      imageGallery: product.imageGallery
    });

    // Verify images are accessible
    const imagesToVerify = [
      product.imageUrl,
      ...(product.imageGallery || [])
    ].filter(url => url && url.trim() !== '');

    if (imagesToVerify.length === 0) {
      return {
        success: true,
        imageData: {
          imageUrl: product.imageUrl || '',
          imageGallery: product.imageGallery || []
        }
      };
    }

    const verification = await verifyImageGallery(imagesToVerify);
    
    if (!verification.valid) {
      console.error(`❌ Some images in saved product are not accessible:`, verification.errors);
      return {
        success: false,
        error: `Product saved but some images are not accessible: ${verification.errors.join(', ')}`
      };
    }

    console.log(`✅ Product ${productId} confirmed saved with all images accessible`);
    
    return {
      success: true,
      imageData: {
        imageUrl: product.imageUrl,
        imageGallery: product.imageGallery
      }
    };

  } catch (error) {
    console.error(`❌ Error confirming product save:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
