export async function uploadListingImages(
  files: File[],
  onProgress?: (progress: number) => void,
): Promise<string[]> {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('You must be logged in to upload images.');
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  return new Promise<string[]>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/listings/upload-images');
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.responseType = 'json';
    request.timeout = 120000;

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress((event.loaded / event.total) * 100);
    };

    request.onload = () => {
      const response = request.response;
      if (request.status >= 200 && request.status < 300) {
        const urls = Array.isArray(response?.urls) ? response.urls : [];
        resolve(urls);
        return;
      }

      reject(new Error(response?.error || 'Image upload failed.'));
    };

    request.onerror = () => {
      reject(new Error('Image upload failed. Please check your connection and try again.'));
    };

    request.ontimeout = () => {
      reject(new Error('Image upload took too long. Please try again.'));
    };

    request.send(formData);
  });
}
