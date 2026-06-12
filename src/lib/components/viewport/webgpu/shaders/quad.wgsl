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

@fragment
fn shadowFragment(input: VertexOutput) -> @location(0) vec4f {
    let radiusPx = max(params.effect.x, 1.0);
    let pixelUvX = dpdx(input.uv);
    let pixelUvY = dpdy(input.uv);
    let centerAlpha = alpha_or_zero(input.uv);

    const SQRT1_2: f32 = 0.70710678;
    const DROP_SHADOW_SAMPLE_DIRECTIONS = array<vec2f, 8>(
        vec2f(0, -1),
        vec2f(SQRT1_2, -SQRT1_2),
        vec2f(1, 0),
        vec2f(SQRT1_2, SQRT1_2),
        vec2f(0, 1),
        vec2f(-SQRT1_2, SQRT1_2),
        vec2f(-1, 0),
        vec2f(-SQRT1_2, -SQRT1_2),
    );
    const DROP_SHADOW_SAMPLE_RING_RADII = array<f32, 6>(
        0.18,
        0.34,
        0.5,
        0.66,
        0.82,
        1.0,
    );
    const DROP_SHADOW_SAMPLE_RING_WEIGHTS = array<f32, 6>(
        1.0,
        0.9,
        0.7,
        0.48,
        0.28,
        0.13,
    );

    var blurredAlpha = centerAlpha * 1.05;
    var totalWeight: f32 = 1.05;

    for (var ringIndex = 0u; ringIndex < 6u; ringIndex = ringIndex + 1u) {
        for (var directionIndex = 0u; directionIndex < 8u; directionIndex = directionIndex + 1u) {
            let offset = DROP_SHADOW_SAMPLE_DIRECTIONS[directionIndex]
                * DROP_SHADOW_SAMPLE_RING_RADII[ringIndex]
                * radiusPx;
            let ringWeight = DROP_SHADOW_SAMPLE_RING_WEIGHTS[ringIndex];
            let sampleUv = input.uv
                + pixelUvX * offset.x
                + pixelUvY * offset.y;

            blurredAlpha += alpha_or_zero(sampleUv) * ringWeight;
            totalWeight += ringWeight;
        }
    }

    let softAlpha = max(
        blurredAlpha / totalWeight - centerAlpha * 0.58,
        0.0,
    );
    let shadowAlpha = pow(
        clamp(
            softAlpha * 1.55,
            0.0,
            1.0,
        ),
        1.45,
    ) * input.tint.a;

    return vec4f(
        input.tint.rgb,
        shadowAlpha,
    );
}
