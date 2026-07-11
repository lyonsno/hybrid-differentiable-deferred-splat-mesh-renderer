// Source-radiance presentation. The compositor color is already the splat's
// display-referred output, including accumulated opacity. Preserve it exactly.

@group(0) @binding(0) var sourceColor: texture_2d<f32>;
@group(0) @binding(1) var outputRadiance: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let dimensions = textureDimensions(sourceColor);
  if (gid.x >= dimensions.x || gid.y >= dimensions.y) {
    return;
  }
  let px = vec2i(gid.xy);
  let sourceRadiance = textureLoad(sourceColor, px, 0);
  textureStore(outputRadiance, px, sourceRadiance);
}
