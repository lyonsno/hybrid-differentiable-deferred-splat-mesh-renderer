/**
 * Standalone test page for the splat overlay P0 integration.
 *
 * Renders splats over a checkerboard background to verify:
 * 1. Transparency works (checkerboard visible through empty pixels)
 * 2. Camera sync works (orbit controls drive the splat view)
 * 3. PLY drag-drop loading works
 * 4. Manifest loading works (default scene)
 */

import { createSplatOverlay, type SplatOverlayHandle } from "./splatOverlay.js";
import {
  createCamera,
  bindCameraControls,
  updateCamera,
  getViewMatrix,
  getProjectionMatrix,
  cameraHasActiveInput,
  rotateCameraView,
  panCamera,
  positionCameraFromTarget,
} from "./camera.js";
import { composeFirstSmokeViewProjection, configureCameraForSplatBounds } from "./realSmokeScene.js";

const info = document.getElementById("info")!;
const dropzone = document.getElementById("dropzone")!;
const viewport = document.getElementById("viewport")!;

async function main() {
  info.textContent = "Creating splat overlay...";

  let overlay: SplatOverlayHandle;
  try {
    overlay = await createSplatOverlay(viewport);
  } catch (e) {
    info.textContent = `WebGPU init failed: ${(e as Error).message}`;
    return;
  }

  // Camera (reuse our orbit camera)
  const cam = createCamera();
  const canvas = overlay.canvas;

  // Bind controls to the overlay canvas (needs pointer-events for this test)
  canvas.style.pointerEvents = "auto";
  bindCameraControls(cam, canvas);

  info.textContent = "Loading default scene...";

  // Load default scene (manifest format)
  try {
    await overlay.loadManifest("/smoke-assets/scaniverse-first-smoke.json");
    info.textContent = "Default scene loaded.";

    // Position camera for the loaded scene
    const scene = overlay.scene;
    if (scene) {
      configureCameraForSplatBounds(cam, scene.attributes.bounds);
    }
  } catch (e) {
    info.textContent = `Default scene failed: ${(e as Error).message}\nDrop a .ply file to load.`;
  }

  // Drag-drop PLY support
  function setupDrop() {
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });
    dropzone.addEventListener("drop", async (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".ply")) {
        info.textContent = "Drop a .ply file.";
        return;
      }
      info.textContent = `Loading ${file.name}...`;
      try {
        const bytes = await file.arrayBuffer();
        await overlay.loadPly(bytes, file.name);
        const scene = overlay.scene;
        if (scene) {
          configureCameraForSplatBounds(cam, scene.attributes.bounds);
        }
        dropzone.textContent = file.name;
        info.textContent = `Loaded: ${file.name} (${overlay.scene?.count.toLocaleString()} splats)`;
      } catch (err) {
        info.textContent = `Load failed: ${(err as Error).message}`;
      }
    });

    // Also support drop on the whole viewport
    viewport.addEventListener("dragover", (e) => e.preventDefault());
    viewport.addEventListener("drop", (e) => {
      // Let the dropzone handler handle it if it was there
      if (e.target !== dropzone) {
        dropzone.dispatchEvent(new DragEvent("drop", { dataTransfer: e.dataTransfer }));
        e.preventDefault();
      }
    });
  }
  setupDrop();

  // Frame loop
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsAccum = 0;
  let displayFps = 0;

  overlay.start();

  function frame() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    frameCount++;
    fpsAccum += dt;
    if (fpsAccum >= 0.5) {
      displayFps = Math.round(frameCount / fpsAccum);
      frameCount = 0;
      fpsAccum = 0;
    }

    updateCamera(cam, dt);

    // Feed camera matrices to overlay
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const aspect = w / h;
    const view = getViewMatrix(cam);
    const proj = getProjectionMatrix(cam, aspect);
    const viewProj = composeFirstSmokeViewProjection(proj, view);
    void viewProj; // viewProj used implicitly through view+proj

    overlay.setCameraMatrices(
      view,
      proj,
      new Float32Array(cam.position),
    );

    // Update info
    const scene = overlay.scene;
    if (scene) {
      info.textContent = `${w}x${h} | ${displayFps} fps | ${scene.count.toLocaleString()} splats | overlay P0 test`;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main().catch((err) => {
  info.textContent = `Error: ${err.message}`;
  console.error(err);
});
