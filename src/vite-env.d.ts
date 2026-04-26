/// <reference types="vite/client" />

declare module "*.wgsl?raw" {
  const src: string;
  export default src;
}
