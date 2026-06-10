struct QuadParams {
    canvasSizePx: vec2f,
    _padding0: vec2f,
    rectPx: vec4f,
    tint: vec4f,
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
    output.uv = uv;
    output.tint = params.tint;
    return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4f {
    return textureSample(textureSource, textureSampler, input.uv) * input.tint;
}
