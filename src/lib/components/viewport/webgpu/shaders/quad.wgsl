struct QuadParams {
    canvasSizePx: vec2f,
    _padding0: vec2f,
    rectPx: vec4f,
    tint: vec4f,
    uvTransform: vec4f,
    effect: vec4f,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) tint: vec4f,
};

@group(0) @binding(0) var<uniform> params: QuadParams;
@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var textureSource: texture_2d<f32>;

@vertex
fn vertex(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    let quad = array<vec2f, 6>(
        vec2f(0, 0),
        vec2f(1, 0),
        vec2f(0, 1),
        vec2f(0, 1),
        vec2f(1, 0),
        vec2f(1, 1),
    );

    let uv = quad[vertexIndex];
    let positionPx = params.rectPx.xy + uv * params.rectPx.zw;
    let clipPosition = vec2f(
        positionPx.x / params.canvasSizePx.x * 2 - 1,
        1 - positionPx.y / params.canvasSizePx.y * 2,
    );

    var output: VertexOutput;
    output.position = vec4f(clipPosition, 0, 1);
    output.uv = uv * params.uvTransform.xy + params.uvTransform.zw;
    output.tint = params.tint;
    return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4f {
    return textureSample(textureSource, textureSampler, input.uv) * input.tint;
}

@fragment
fn multiplyFragment(input: VertexOutput) -> @location(0) vec4f {
    let color = textureSample(textureSource, textureSampler, input.uv) * input.tint;

    return vec4f(
        color.rgb * color.a,
        color.a,
    );
}

fn alpha_or_zero(uv: vec2f) -> f32 {
    let clampedUv = clamp(
        uv,
        vec2f(0.0),
        vec2f(1.0),
    );
    let insideTexture = all(uv >= vec2f(0.0)) && all(uv <= vec2f(1.0));
    let alpha = textureSampleLevel(
        textureSource,
        textureSampler,
        clampedUv,
        0.0,
    ).a;

    return select(
        0.0,
        alpha,
        insideTexture,
    );
}

fn blurred_alpha(
    uv: vec2f,
    pixelUvX: vec2f,
    pixelUvY: vec2f,
    radiusPx: f32,
) -> f32 {
    const SQRT1_2: f32 = 0.70710678;
    const SAMPLE_DIRECTIONS = array<vec2f, 8>(
        vec2f(0, -1),
        vec2f(SQRT1_2, -SQRT1_2),
        vec2f(1, 0),
        vec2f(SQRT1_2, SQRT1_2),
        vec2f(0, 1),
        vec2f(-SQRT1_2, SQRT1_2),
        vec2f(-1, 0),
        vec2f(-SQRT1_2, -SQRT1_2),
    );
    const SAMPLE_RING_RADII = array<f32, 6>(
        0.18,
        0.34,
        0.5,
        0.66,
        0.82,
        1.0,
    );
    const SAMPLE_RING_WEIGHTS = array<f32, 6>(
        1.0,
        0.9,
        0.7,
        0.48,
        0.28,
        0.13,
    );

    var blurredAlpha = alpha_or_zero(uv) * 1.05;
    var totalWeight: f32 = 1.05;

    for (var ringIndex = 0u; ringIndex < 6u; ringIndex = ringIndex + 1u) {
        for (var directionIndex = 0u; directionIndex < 8u; directionIndex = directionIndex + 1u) {
            let offset = SAMPLE_DIRECTIONS[directionIndex]
                * SAMPLE_RING_RADII[ringIndex]
                * radiusPx;
            let ringWeight = SAMPLE_RING_WEIGHTS[ringIndex];
            let sampleUv = uv
                + pixelUvX * offset.x
                + pixelUvY * offset.y;

            blurredAlpha += alpha_or_zero(sampleUv) * ringWeight;
            totalWeight += ringWeight;
        }
    }

    return blurredAlpha / totalWeight;
}

fn dilated_alpha(
    uv: vec2f,
    pixelUvX: vec2f,
    pixelUvY: vec2f,
    radiusPx: f32,
) -> f32 {
    const SQRT1_2: f32 = 0.70710678;
    const SAMPLE_DIRECTIONS = array<vec2f, 16>(
        vec2f(0, -1),
        vec2f(0.38268343, -0.92387953),
        vec2f(SQRT1_2, -SQRT1_2),
        vec2f(0.92387953, -0.38268343),
        vec2f(1, 0),
        vec2f(0.92387953, 0.38268343),
        vec2f(SQRT1_2, SQRT1_2),
        vec2f(0.38268343, 0.92387953),
        vec2f(0, 1),
        vec2f(-0.38268343, 0.92387953),
        vec2f(-SQRT1_2, SQRT1_2),
        vec2f(-0.92387953, 0.38268343),
        vec2f(-1, 0),
        vec2f(-0.92387953, -0.38268343),
        vec2f(-SQRT1_2, -SQRT1_2),
        vec2f(-0.38268343, -0.92387953),
    );
    const SAMPLE_RING_RADII = array<f32, 3>(
        0.38,
        0.72,
        1.0,
    );

    var maxAlpha = alpha_or_zero(uv);

    for (var ringIndex = 0u; ringIndex < 3u; ringIndex = ringIndex + 1u) {
        for (var directionIndex = 0u; directionIndex < 16u; directionIndex = directionIndex + 1u) {
            let offset = SAMPLE_DIRECTIONS[directionIndex]
                * SAMPLE_RING_RADII[ringIndex]
                * radiusPx;
            let sampleUv = uv
                + pixelUvX * offset.x
                + pixelUvY * offset.y;

            maxAlpha = max(
                maxAlpha,
                alpha_or_zero(sampleUv),
            );
        }
    }

    return maxAlpha;
}

@fragment
fn outlineFragment(input: VertexOutput) -> @location(0) vec4f {
    let radiusPx = max(params.effect.x, 1.0);
    let pixelUvX = dpdx(input.uv);
    let pixelUvY = dpdy(input.uv);
    let centerAlpha = alpha_or_zero(input.uv);
    let strokeAlpha = dilated_alpha(
        input.uv,
        pixelUvX,
        pixelUvY,
        radiusPx,
    );
    let outsideImage = 1.0 - smoothstep(
        0.04,
        0.72,
        centerAlpha,
    );
    let outlineAlpha = smoothstep(
        0.08,
        0.2,
        strokeAlpha,
    ) * outsideImage * input.tint.a;

    return vec4f(
        input.tint.rgb,
        outlineAlpha,
    );
}

@fragment
fn dropShadowFragment(input: VertexOutput) -> @location(0) vec4f {
    let radiusPx = max(params.effect.x, 1.0);
    let pixelUvX = dpdx(input.uv);
    let pixelUvY = dpdy(input.uv);
    let offsetPx = params.effect.yz;
    let sourceUv = input.uv
        - pixelUvX * offsetPx.x
        - pixelUvY * offsetPx.y;
    let blurAlpha = blurred_alpha(
        sourceUv,
        pixelUvX,
        pixelUvY,
        radiusPx,
    );
    let centerAlpha = alpha_or_zero(input.uv);
    let outsideMask = 1.0 - smoothstep(
        0.02,
        0.55,
        centerAlpha,
    );
    let shadowAlpha = pow(
        clamp(
            blurAlpha * outsideMask * 2.05,
            0.0,
            1.0,
        ),
        0.92,
    ) * input.tint.a;
    let multiplier = mix(
        vec3f(1.0),
        input.tint.rgb,
        shadowAlpha,
    );

    return vec4f(
        multiplier,
        1.0,
    );
}
