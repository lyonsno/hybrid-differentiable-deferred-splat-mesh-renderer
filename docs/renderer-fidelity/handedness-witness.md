# Handedness Witness

Lane: `handedness-witness`
Packet: `metadosis/coordination-packets/meshsplat-renderer-reference-parity_2026-04-29.md`
Branch: `cc/asymmetric-mirror-handedness-witness`

## Conclusion

The current renderer path does not introduce a source-space horizontal mirror through loader xyz decode, quaternion decode, or first-smoke camera framing.

The executable witness classifies the current contract as:

- source xyz: preserve source coordinates exactly
- source rotations: preserve `wxyz` quaternions exactly
- first-smoke presentation: apply a post-projection Y flip only
- first-smoke camera: positive source X remains screen-right in the default framed view
- true future coordinate reflection: allowed only if position reflection is paired with the corresponding quaternion/axis transform

So, for sibling lanes: do not solve Scaniverse reference parity by silently flipping source positions, changing `wxyz` order, or negating quaternion components in a loader or shader. Treat the observed side-by-side mirror suspicion as either native-reference camera convention, side-by-side presentation alignment, or an explicit future coordinate reflection that must be designed as a paired position/quaternion transform.

## Evidence

`tests/renderer/handednessWitness.test.mjs` and `src/rendererFidelityProbes/handednessWitness.js` define an asymmetric triangle and anisotropic oriented Gaussian witness. The asymmetry matters: a symmetric fixture can pass under a mirror without exposing the error.

The witness asserts:

- the source triangle remains `[-2, -1, 4]`, `[3, -1, 4]`, `[-1, 2, 4]`
- the source orientation remains `[0.9238795325112867, 0, 0, 0.3826834323650898]`
- identity first-smoke presentation maps X with the same sign and Y with the opposite sign
- default first-smoke camera framing maps positive source X to screen-right
- a mirror across X breaks an anisotropic covariance if positions are reflected but the source quaternion is left unpaired
- the paired transform `R' = M R S`, where `M` is the coordinate reflection and `S` flips the same Gaussian local axis, preserves the mirrored covariance while remaining representable as a proper rotation/quaternion

The last point is the important quaternion rule. A coordinate reflection is not itself a unit quaternion rotation. Because a Gaussian covariance is unchanged by flipping the sign of one local axis, a true reflection can be represented by pairing the world reflection with a local-axis sign repair. Applying only one side of that pair is a handedness bug.

## Consumed Prior Contracts

- `field-autopsy`: source positions, log scales, `wxyz` rotations, opacity activation, and SH DC color are preserved through browser/export parity.
- `realSmokeScene`: first-smoke presentation already has an explicit post-projection vertical flip test.
- `conic-reckoner`: covariance witnesses consume the same `wxyz` rotation semantics and must not redefine coordinate handedness.

## Remaining Uncertainty

This lane did not receive a native Scaniverse camera matrix or exact screenshot pose. Therefore it cannot prove that the human-observed mirror is purely a presentation mismatch against the native reference. It can rule out the current renderer's loader xyz decode, unpaired quaternion decode, and first-smoke horizontal presentation flip as causes.

The next closeable reference-pose step belongs in steward integration or a narrow visual-smoke fixture: record a native-reference pose convention beside the browser view and classify whether its camera basis differs by an explicit reflection or only by screenshot alignment.
