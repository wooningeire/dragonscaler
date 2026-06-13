import type { CharacterRenderFrame } from "../characterRenderModel";
import {
    CHARACTER_IMAGE_DROP_SHADOW_MULTIPLIER,
    CHARACTER_IMAGE_DROP_SHADOW_OFFSET_X_PX,
    CHARACTER_IMAGE_DROP_SHADOW_OFFSET_Y_PX,
    CHARACTER_IMAGE_DROP_SHADOW_RADIUS_PX,
    CHARACTER_IMAGE_OUTLINE_COLOR,
    CHARACTER_IMAGE_OUTLINE_RADIUS_PX,
    IMAGE_TINT,
    PLACEHOLDER_COLOR,
} from "./constants";
import {
    characterImageEffectRectPx,
    characterImageEffectUvTransform,
} from "./imageShadow";
import type { WebGpuLineRenderer } from "./lineRenderer";
import { characterLabelRectPx } from "./nameplateLayout";
import type { WebGpuQuadRenderer } from "./quadRenderer";
import type {
    LineVertexRange,
    TextureResource,
} from "./types";
import { withOpacity } from "./utils";

export type CharacterImageQuadDrawState = {
    quadIndex: number,
    outlineQuadIndex: number,
    dropShadowQuadIndex: number,
};

type GridlineLabelDrawOptions = {
    pass: GPURenderPassEncoder,
    frame: CharacterRenderFrame,
    gridLabelTextures: TextureResource[],
    gridQuadRenderer: WebGpuQuadRenderer,
    quadIndex: number,
};

type CharacterLabelDrawOptions = {
    pass: GPURenderPassEncoder,
    frame: CharacterRenderFrame,
    characterLabelTextures: (TextureResource | null)[],
    quadRenderer: WebGpuQuadRenderer,
    pixelRatio: number,
    quadIndex: number,
};

type FrameContentDrawOptions = {
    pass: GPURenderPassEncoder,
    frame: CharacterRenderFrame,
    characterTextures: TextureResource[],
    gridLabelTextures: TextureResource[],
    characterLabelTextures: (TextureResource | null)[],
    quadRenderer: WebGpuQuadRenderer,
    gridQuadRenderer: WebGpuQuadRenderer,
    outlineQuadRenderer: WebGpuQuadRenderer,
    dropShadowQuadRenderer: WebGpuQuadRenderer,
    gridLineRenderer: WebGpuLineRenderer,
    lineRenderer: WebGpuLineRenderer,
    gridLineRange: LineVertexRange,
    characterLineRange: LineVertexRange,
    pixelRatio: number,
} & CharacterImageQuadDrawState;

const drawGridlineLabels = ({
    pass,
    frame,
    gridLabelTextures,
    gridQuadRenderer,
    quadIndex,
}: GridlineLabelDrawOptions) => {
    let gridLabelIndex = 0;

    for (const gridline of frame.gridlines) {
        if (gridline.orientation !== "y" || gridline.weight === "light") continue;

        const texture = gridLabelTextures[gridLabelIndex];
        gridLabelIndex += 1;
        quadIndex = gridQuadRenderer.drawTextureQuad(
            pass,
            quadIndex,
            frame,
            {
                x: 8,
                y: gridline.offsetPx + 8,
                width: texture.widthPx,
                height: texture.heightPx,
            },
            texture,
            IMAGE_TINT,
        );
    }

    return quadIndex;
};

const drawCharacterLabels = ({
    pass,
    frame,
    characterLabelTextures,
    quadRenderer,
    pixelRatio,
    quadIndex,
}: CharacterLabelDrawOptions) => {
    for (let index = 0; index < frame.items.length; index++) {
        const item = frame.items[index];
        if (item.labelOpacity < 0.02) continue;

        const texture = characterLabelTextures[index];
        if (texture === null) continue;

        quadIndex = quadRenderer.drawTextureQuad(
            pass,
            quadIndex,
            frame,
            characterLabelRectPx(
                item,
                texture,
                pixelRatio,
            ),
            texture,
            withOpacity(IMAGE_TINT, item.labelOpacity),
        );
    }

    return quadIndex;
};

export const drawFrameContent = ({
    pass,
    frame,
    characterTextures,
    gridLabelTextures,
    characterLabelTextures,
    quadRenderer,
    gridQuadRenderer,
    outlineQuadRenderer,
    dropShadowQuadRenderer,
    gridLineRenderer,
    lineRenderer,
    gridLineRange,
    characterLineRange,
    pixelRatio,
    quadIndex,
    outlineQuadIndex,
    dropShadowQuadIndex,
}: FrameContentDrawOptions): CharacterImageQuadDrawState => {
    const drawGridlines = () => {
        gridLineRenderer.drawRange(
            pass,
            gridLineRange,
        );
        quadIndex = drawGridlineLabels({
            pass,
            frame,
            gridLabelTextures,
            gridQuadRenderer,
            quadIndex,
        });
    };

    if (!frame.gridlinesOnTop) {
        drawGridlines();
    }

    ({
        quadIndex,
        outlineQuadIndex,
        dropShadowQuadIndex,
    } = drawCharacterImageQuads({
        pass,
        frame,
        characterTextures,
        quadRenderer,
        outlineQuadRenderer,
        dropShadowQuadRenderer,
        quadIndex,
        outlineQuadIndex,
        dropShadowQuadIndex,
    }));

    if (frame.gridlinesOnTop) {
        drawGridlines();
    }

    lineRenderer.drawRange(
        pass,
        characterLineRange,
    );
    quadIndex = drawCharacterLabels({
        pass,
        frame,
        characterLabelTextures,
        quadRenderer,
        pixelRatio,
        quadIndex,
    });

    return {
        quadIndex,
        outlineQuadIndex,
        dropShadowQuadIndex,
    };
};

export const drawCharacterImageQuads = ({
    pass,
    frame,
    characterTextures,
    quadRenderer,
    outlineQuadRenderer,
    dropShadowQuadRenderer,
    quadIndex,
    outlineQuadIndex,
    dropShadowQuadIndex,
}: {
    pass: GPURenderPassEncoder,
    frame: CharacterRenderFrame,
    characterTextures: TextureResource[],
    quadRenderer: WebGpuQuadRenderer,
    outlineQuadRenderer: WebGpuQuadRenderer,
    dropShadowQuadRenderer: WebGpuQuadRenderer,
} & CharacterImageQuadDrawState): CharacterImageQuadDrawState => {
    for (let index = 0; index < frame.items.length; index++) {
        const item = frame.items[index];

        if (item.image !== null) {
            const outlineRectPx = characterImageEffectRectPx(
                item.rectPx,
                CHARACTER_IMAGE_OUTLINE_RADIUS_PX,
            );
            const dropShadowOffsetPx = {
                x: CHARACTER_IMAGE_DROP_SHADOW_OFFSET_X_PX,
                y: CHARACTER_IMAGE_DROP_SHADOW_OFFSET_Y_PX,
            };
            const dropShadowRectPx = characterImageEffectRectPx(
                item.rectPx,
                CHARACTER_IMAGE_DROP_SHADOW_RADIUS_PX,
                dropShadowOffsetPx,
            );

            dropShadowQuadIndex = dropShadowQuadRenderer.drawTextureQuad(
                pass,
                dropShadowQuadIndex,
                frame,
                dropShadowRectPx,
                characterTextures[index],
                withOpacity(CHARACTER_IMAGE_DROP_SHADOW_MULTIPLIER, item.opacity),
                {
                    effect: [
                        CHARACTER_IMAGE_DROP_SHADOW_RADIUS_PX,
                        dropShadowOffsetPx.x,
                        dropShadowOffsetPx.y,
                        0,
                    ],
                    uvTransform: characterImageEffectUvTransform(
                        item.rectPx,
                        dropShadowRectPx,
                        item.flippedHorizontally,
                    ),
                },
            );
            outlineQuadIndex = outlineQuadRenderer.drawTextureQuad(
                pass,
                outlineQuadIndex,
                frame,
                outlineRectPx,
                characterTextures[index],
                withOpacity(CHARACTER_IMAGE_OUTLINE_COLOR, item.opacity),
                {
                    effect: [
                        CHARACTER_IMAGE_OUTLINE_RADIUS_PX,
                        0,
                        0,
                        0,
                    ],
                    uvTransform: characterImageEffectUvTransform(
                        item.rectPx,
                        outlineRectPx,
                        item.flippedHorizontally,
                    ),
                },
            );
        }

        quadIndex = quadRenderer.drawTextureQuad(
            pass,
            quadIndex,
            frame,
            item.rectPx,
            characterTextures[index],
            item.image === null
                ? withOpacity(PLACEHOLDER_COLOR, item.opacity)
                : withOpacity(IMAGE_TINT, item.opacity),
            {
                flipX: item.flippedHorizontally,
            },
        );
    }

    return {
        quadIndex,
        outlineQuadIndex,
        dropShadowQuadIndex,
    };
};
