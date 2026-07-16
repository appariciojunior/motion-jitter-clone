// Shared image-decode path for both renderers. Uploads are blob: URLs with no
// file extension, which library-level loaders (PIXI.Assets, THREE.TextureLoader
// routing) can mis-handle — decoding via HTMLImageElement is reliable for both.
export function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img
      .decode()
      .then(() => resolve(img))
      .catch(() => resolve(null)); // unreadable/revoked URL — caller keeps placeholder
  });
}
