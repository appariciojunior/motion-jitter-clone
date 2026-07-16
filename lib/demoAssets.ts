// Bundled starter images (public/demo, 1080px long edge) seeded into the
// asset list so every template opens populated with real photos instead of
// numbered placeholders. Users can clear/replace them like any upload.
export const DEMO_ASSETS = Array.from({ length: 12 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return {
    name: `Demo ${n}`,
    url: `/demo/demo-${n}.jpg`,
  };
});
