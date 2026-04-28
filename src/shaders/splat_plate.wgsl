struct FrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  splatScale: f32,
  minRadiusPx: f32,
};

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) alpha: f32,
  @location(2) local: vec2f,
};

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(1) @binding(0) var<storage, read> positions: array<f32>;
@group(1) @binding(1) var<storage, read> colors: array<f32>;
@group(1) @binding(2) var<storage, read> opacities: array<f32>;
@group(1) @binding(3) var<storage, read> scales: array<f32>;
@group(1) @binding(4) var<storage, read> rotations: array<f32>;
@group(1) @binding(5) var<storage, read> sortedIndices: array<u32>;

const quadCorners = array<vec2f, 6>(
  vec2f(-1.0, -1.0),
  vec2f( 1.0, -1.0),
  vec2f(-1.0,  1.0),
  vec2f(-1.0,  1.0),
  vec2f( 1.0, -1.0),
  vec2f( 1.0,  1.0),
);

const MIN_SPLAT_CLIP_W = 0.0001;

struct EllipseAxes {
  major: vec2f,
  minor: vec2f,
};

struct SplatShape {
  axis0: vec3f,
  axis1: vec3f,
  axis2: vec3f,
};

fn rotateAxis(rotation: vec4f, axis: vec3f) -> vec3f {
  let q = rotation / max(length(rotation), 0.000001);
  let u = vec3f(q.y, q.z, q.w);
  return axis + 2.0 * cross(u, cross(u, axis) + q.x * axis);
}

fn makeSplatShape(scaleLog: vec3f, rotation: vec4f) -> SplatShape {
  let scale = exp(scaleLog);
  return SplatShape(
    rotateAxis(rotation, vec3f(1.0, 0.0, 0.0)) * scale.x,
    rotateAxis(rotation, vec3f(0.0, 1.0, 0.0)) * scale.y,
    rotateAxis(rotation, vec3f(0.0, 0.0, 1.0)) * scale.z,
  );
}

fn viewProjectionLinearRow(row: u32) -> vec3f {
  return vec3f(frame.viewProj[0][row], frame.viewProj[1][row], frame.viewProj[2][row]);
}

fn projectAxisJacobian(axis: vec3f, centerClip: vec4f) -> vec2f {
  let viewProjRow0 = viewProjectionLinearRow(0u);
  let viewProjRow1 = viewProjectionLinearRow(1u);
  let viewProjRow3 = viewProjectionLinearRow(3u);
  let safeW = max(abs(centerClip.w), MIN_SPLAT_CLIP_W);
  let clipW2 = safeW * safeW;
  let viewJacobianX = (centerClip.w * viewProjRow0 - centerClip.x * viewProjRow3) / clipW2;
  let viewJacobianY = (centerClip.w * viewProjRow1 - centerClip.y * viewProjRow3) / clipW2;
  return vec2f(dot(viewJacobianX, axis), dot(viewJacobianY, axis));
}

fn ellipseAxesFromCovariance(
  axis0: vec2f,
  axis1: vec2f,
  axis2: vec2f,
  minRadiusNdc: f32,
) -> EllipseAxes {
  let a = axis0.x * axis0.x + axis1.x * axis1.x + axis2.x * axis2.x;
  let b = axis0.x * axis0.y + axis1.x * axis1.y + axis2.x * axis2.y;
  let d = axis0.y * axis0.y + axis1.y * axis1.y + axis2.y * axis2.y;
  let trace = 0.5 * (a + d);
  let diff = 0.5 * (a - d);
  let root = sqrt(diff * diff + b * b);
  let lambda0 = max(trace + root, 0.0);
  let lambda1 = max(trace - root, 0.0);

  var majorDir = vec2f(1.0, 0.0);
  if (abs(b) + abs(lambda0 - a) > 0.00000001) {
    majorDir = normalize(vec2f(b, lambda0 - a));
  } else if (d > a) {
    majorDir = vec2f(0.0, 1.0);
  }
  let minorDir = vec2f(-majorDir.y, majorDir.x);

  let anisotropicScale = frame.splatScale / 600.0;
  let majorRadius = max(sqrt(lambda0) * anisotropicScale, minRadiusNdc);
  let minorRadius = max(sqrt(lambda1) * anisotropicScale, minRadiusNdc);
  return EllipseAxes(majorDir * majorRadius, minorDir * minorRadius);
}

fn minimumRadiusNdc() -> f32 {
  let viewportMin = max(min(frame.viewport.x, frame.viewport.y), 1.0);
  return (2.0 * frame.minRadiusPx) / viewportMin;
}

fn projectSplatAxes(shape: SplatShape, centerClip: vec4f) -> EllipseAxes {
  let axis0 = projectAxisJacobian(shape.axis0, centerClip);
  let axis1 = projectAxisJacobian(shape.axis1, centerClip);
  let axis2 = projectAxisJacobian(shape.axis2, centerClip);
  return ellipseAxesFromCovariance(axis0, axis1, axis2, minimumRadiusNdc());
}

fn lodProxyAxes() -> EllipseAxes {
  let radius = minimumRadiusNdc();
  return EllipseAxes(vec2f(radius, 0.0), vec2f(0.0, radius));
}

fn clipPointInside(point: vec3f) -> bool {
  return splatCenterInsideClip(frame.viewProj * vec4f(point, 1.0));
}

fn splatSupportInsideClip(position: vec3f, shape: SplatShape) -> bool {
  if (!clipPointInside(position + shape.axis0) || !clipPointInside(position - shape.axis0)) {
    return false;
  }
  if (!clipPointInside(position + shape.axis1) || !clipPointInside(position - shape.axis1)) {
    return false;
  }
  if (!clipPointInside(position + shape.axis2) || !clipPointInside(position - shape.axis2)) {
    return false;
  }
  return true;
}

fn alphaForFootprintPolicy(opacity: f32, usingLodProxy: bool) -> f32 {
  let activatedOpacity = clamp(opacity, 0.0, 1.0);
  if (usingLodProxy) {
    // First-smoke LOD keeps activated opacity, but the bounded footprint cap intentionally reduces total screen energy.
    return activatedOpacity;
  }
  return activatedOpacity;
}

fn splatCenterInsideClip(centerClip: vec4f) -> bool {
  if (centerClip.w <= MIN_SPLAT_CLIP_W) {
    return false;
  }
  if (centerClip.z < 0.0 || centerClip.z > centerClip.w) {
    return false;
  }
  return true;
}

@vertex
fn vs(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
) -> VertexOut {
  let splatId = sortedIndices[instanceIndex];
  let vecBase = splatId * 3u;
  let position = vec3f(positions[vecBase], positions[vecBase + 1u], positions[vecBase + 2u]);
  let color = vec3f(colors[vecBase], colors[vecBase + 1u], colors[vecBase + 2u]);
  let opacity = opacities[splatId];
  let scale = vec3f(scales[vecBase], scales[vecBase + 1u], scales[vecBase + 2u]);
  let quatBase = splatId * 4u;
  let rotation = vec4f(rotations[quatBase], rotations[quatBase + 1u], rotations[quatBase + 2u], rotations[quatBase + 3u]);
  let centerClip = frame.viewProj * vec4f(position, 1.0);
  let local = quadCorners[vertexIndex];

  var out: VertexOut;
  if (!splatCenterInsideClip(centerClip)) {
    out.position = vec4f(2.0, 2.0, 0.0, 1.0);
    out.color = vec3f(0.0);
    out.alpha = 0.0;
    out.local = vec2f(2.0);
    return out;
  }

  let shape = makeSplatShape(scale, rotation);
  var axes = projectSplatAxes(shape, centerClip);
  var usingLodProxy = false;
  if (!splatSupportInsideClip(position, shape)) {
    axes = lodProxyAxes();
    usingLodProxy = true;
  }
  let ellipseOffset = axes.major * local.x + axes.minor * local.y;

  out.position = vec4f(
    centerClip.xy + ellipseOffset * centerClip.w,
    centerClip.z,
    centerClip.w,
  );
  out.color = clamp(color, vec3f(0.0), vec3f(1.0));
  out.alpha = alphaForFootprintPolicy(opacity, usingLodProxy);
  out.local = local;
  return out;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let r2 = dot(in.local, in.local);
  if (r2 > 1.0) {
    discard;
  }

  let alpha = in.alpha * exp(-2.0 * r2);
  return vec4f(in.color, alpha);
}
