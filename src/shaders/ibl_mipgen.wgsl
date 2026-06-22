// Downsample a texture level by 2x2 box filter for mip chain generation.
// Dispatch: ceil(outputWidth/8) x ceil(outputHeight/8)

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let outSize = textureDimensions(outputTex);
  if (gid.x >= outSize.x || gid.y >= outSize.y) { return; }

  let srcCoord = vec2i(gid.xy) * 2;
  let s00 = textureLoad(inputTex, srcCoord, 0);
  let s10 = textureLoad(inputTex, srcCoord + vec2i(1, 0), 0);
  let s01 = textureLoad(inputTex, srcCoord + vec2i(0, 1), 0);
  let s11 = textureLoad(inputTex, srcCoord + vec2i(1, 1), 0);

  textureStore(outputTex, vec2i(gid.xy), (s00 + s10 + s01 + s11) * 0.25);
}
