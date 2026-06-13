struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
};

@vertex
fn vertex(
    @location(0) position: vec2f,
    @location(1) color: vec4f,
) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f(position, 0, 1);
    output.color = color;
    return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4f {
    return input.color;
}

@fragment
fn multiplyFragment(input: VertexOutput) -> @location(0) vec4f {
    return vec4f(
        input.color.rgb * input.color.a,
        input.color.a,
    );
}
