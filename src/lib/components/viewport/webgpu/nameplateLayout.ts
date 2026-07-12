import type { CharacterRenderItem, GridlineRenderItem, RectPx } from "../characterRenderModel";
import type {
    TextTextureSpec,
    TextureSizePx,
} from "./types";

type AvatarRectPx = {
    x: number,
    y: number,
    size: number,
};

type CharacterLabelTextureLayout = {
    name: string,
    owners: CharacterRenderItem["owners"],
    scale: number,
    nameFont: string,
    ownerFont: string,
    texture: TextureSizePx,
    panelRect: RectPx,
    contentX: number,
    nameY: number,
};

const VIEWPORT_FONT_FAMILY = "\"Belanosima\", sans-serif";
const GRIDLINE_LABEL_FONT_SIZE_PX = 14;
const CHARACTER_NAME_FONT_SIZE_PX = 24;
const CHARACTER_OWNER_FONT_SIZE_PX = 13;
const GRIDLINE_LABEL_FONT = `${GRIDLINE_LABEL_FONT_SIZE_PX}px ${VIEWPORT_FONT_FAMILY}`;
const CHARACTER_NAME_FONT = `${CHARACTER_NAME_FONT_SIZE_PX}px ${VIEWPORT_FONT_FAMILY}`;
const CHARACTER_OWNER_FONT = `${CHARACTER_OWNER_FONT_SIZE_PX}px ${VIEWPORT_FONT_FAMILY}`;
export const TEXT_TEXTURE_FONTS = [
    GRIDLINE_LABEL_FONT,
    CHARACTER_NAME_FONT,
    CHARACTER_OWNER_FONT,
] as const;

const GRIDLINE_LABEL_COLOR = "rgba(52, 74, 47, 0.68)";
const NAMEPLATE_MIN_WIDTH_PX = 112;
const NAMEPLATE_INLINE_PADDING_PX = 10;
const NAMEPLATE_BLOCK_PADDING_PX = 8;
const NAMEPLATE_OWNER_TOP_GAP_PX = 4;
const NAMEPLATE_OWNER_AVATAR_SIZE_PX = 22;
const NAMEPLATE_OWNER_TEXT_GAP_PX = 6;
const NAMEPLATE_OWNER_ROW_GAP_PX = 4;
const NAMEPLATE_OWNER_TEXT_OFFSET_Y_PX = 4;
const NAMEPLATE_BORDER_RADIUS_PX = 10;
const NAMEPLATE_BORDER_WIDTH_PX = 1;
const NAMEPLATE_SHADOW_OUTSET_PX = 14;
const NAMEPLATE_SHADOW_BLUR_PX = 10;
const NAMEPLATE_SHADOW_OFFSET_Y_PX = 3;
const NAMEPLATE_WORLD_SCALE_TARGET_PX = 256;
const NAMEPLATE_BG_COLOR = "rgba(232, 248, 224, 0.68)";
const NAMEPLATE_BORDER_COLOR = "rgba(255, 255, 255, 0.6)";
const NAMEPLATE_SHADOW_COLOR = "rgba(30, 48, 27, 0.24)";
const NAMEPLATE_NAME_COLOR = "rgba(20, 34, 19, 0.95)";
const NAMEPLATE_OWNER_COLOR = "rgba(47, 71, 43, 0.9)";
const NAMEPLATE_AVATAR_PLACEHOLDER_COLOR = "rgba(196, 214, 201, 1)";
const NAMEPLATE_AVATAR_RING_COLOR = "rgba(255, 255, 255, 0.72)";

export const loadTextFonts = async () => {
    if (!("fonts" in document)) return;

    const fonts = document.fonts;

    try {
        // Canvas text textures are static. Wait before caching them so the first draw
        // does not permanently bake browser fallback fonts into the nameplates.
        await Promise.all([
            ...TEXT_TEXTURE_FONTS.map(font => fonts.load(font)),
            fonts.ready,
        ]);
    } catch {
        // Font loading failure should not block the chart from rendering.
    }
};

export const gridlineTextSpec = (gridline: GridlineRenderItem): TextTextureSpec => {
    const text = `${formatMeters(gridline.coordMeters)} m`;
    const widthPx = Math.max(
        48,
        Math.ceil(measureTextWidthPx(GRIDLINE_LABEL_FONT, text)) + 16,
    );
    const heightPx = 28;

    return {
        cacheKey: `grid:${text}`,
        widthPx,
        heightPx,
        draw: context => {
            context.font = GRIDLINE_LABEL_FONT;
            context.fillStyle = GRIDLINE_LABEL_COLOR;
            context.textBaseline = "top";
            context.fillText(text, 8, 6);
        },
    };
};

export const characterLabelTextSpec = (
    item: CharacterRenderItem,
    getAvatarBitmap: (avatarUrl: string | null) => Promise<ImageBitmap | null>,
): TextTextureSpec => {
    const layout = characterLabelTextureLayout(item);
    const textKey = JSON.stringify({
        name: layout.name,
        owners: layout.owners.map(owner => ({
            name: owner.name,
            avatarUrl: owner.avatarUrl,
        })),
        scale: layout.scale,
    });

    return {
        cacheKey: `character-label:${textKey}`,
        widthPx: layout.texture.widthPx,
        heightPx: layout.texture.heightPx,
        draw: async context => {
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";

            drawNameplatePanel(
                context,
                layout.panelRect,
                NAMEPLATE_BORDER_RADIUS_PX * layout.scale,
                layout.scale,
            );

            context.fillStyle = NAMEPLATE_NAME_COLOR;
            context.textBaseline = "top";
            context.font = layout.nameFont;
            context.fillText(
                layout.name,
                layout.contentX,
                layout.nameY,
            );

            if (layout.owners.length === 0) return;

            context.font = layout.ownerFont;
            context.fillStyle = NAMEPLATE_OWNER_COLOR;

            for (let index = 0; index < layout.owners.length; index++) {
                const owner = layout.owners[index];
                const ownerY = (
                    NAMEPLATE_BLOCK_PADDING_PX
                    + CHARACTER_NAME_FONT_SIZE_PX
                    + NAMEPLATE_OWNER_TOP_GAP_PX
                    + index * (NAMEPLATE_OWNER_AVATAR_SIZE_PX + NAMEPLATE_OWNER_ROW_GAP_PX)
                ) * layout.scale + layout.panelRect.y;
                const avatarSizePx = NAMEPLATE_OWNER_AVATAR_SIZE_PX * layout.scale;

                await drawOwnerAvatar(
                    context,
                    await getAvatarBitmap(owner.avatarUrl),
                    {
                        x: layout.contentX,
                        y: ownerY,
                        size: avatarSizePx,
                    },
                );

                if (owner.name === "") continue;

                context.fillText(
                    owner.name,
                    layout.contentX
                    + (NAMEPLATE_OWNER_AVATAR_SIZE_PX + NAMEPLATE_OWNER_TEXT_GAP_PX) * layout.scale,
                    ownerY + NAMEPLATE_OWNER_TEXT_OFFSET_Y_PX * layout.scale,
                );
            }
        },
    };
};

export const characterLabelScale = (item: CharacterRenderItem) => (
    item.rectPx.height / NAMEPLATE_WORLD_SCALE_TARGET_PX
);

export const characterLabelTextureSizePx = (item: CharacterRenderItem): TextureSizePx => (
    characterLabelTextureLayout(item).texture
);

export const characterLabelRectPx = (
    item: CharacterRenderItem,
    texture: TextureSizePx,
    pixelRatio: number,
): RectPx => {
    const scale = characterLabelScale(item);
    const shadowOutsetPx = NAMEPLATE_SHADOW_OUTSET_PX * scale;
    const imageRightPx = item.rectPx.x + item.rectPx.width;
    const imageAnchorYPx = (
        item.rectPx.y
        + (1 - item.character.anchor.y) * item.rectPx.height
    );

    return {
        x: alignDevicePx(
            imageRightPx - texture.widthPx + shadowOutsetPx,
            pixelRatio,
        ),
        y: alignDevicePx(
            imageAnchorYPx + 8 * scale - shadowOutsetPx,
            pixelRatio,
        ),
        width: texture.widthPx,
        height: texture.heightPx,
    };
};

export const characterLabelPanelRectPx = (
    item: CharacterRenderItem,
    pixelRatio: number,
): RectPx => {
    const layout = characterLabelTextureLayout(item);
    const textureRect = characterLabelRectPx(
        item,
        layout.texture,
        pixelRatio,
    );

    return {
        x: textureRect.x + layout.panelRect.x,
        y: textureRect.y + layout.panelRect.y,
        width: layout.panelRect.width,
        height: layout.panelRect.height,
    };
};

const characterLabelTextureLayout = (
    item: CharacterRenderItem,
): CharacterLabelTextureLayout => {
    const scale = characterLabelScale(item);
    const nameFont = fontWithSize(CHARACTER_NAME_FONT_SIZE_PX * scale);
    const ownerFont = fontWithSize(CHARACTER_OWNER_FONT_SIZE_PX * scale);
    const owners = item.owners.filter(owner => (
        owner.name !== ""
        || owner.avatarUrl !== null
    ));
    const name = item.name === "" ? "unnamed character" : item.name;
    const inlinePaddingPx = NAMEPLATE_INLINE_PADDING_PX * scale;
    const blockPaddingPx = NAMEPLATE_BLOCK_PADDING_PX * scale;
    const shadowOutsetPx = NAMEPLATE_SHADOW_OUTSET_PX * scale;
    const nameWidthPx = measureTextWidthPx(nameFont, name);
    const ownerWidthPx = Math.max(
        ...owners.map(owner => {
            const ownerTextWidthPx = owner.name === ""
                ? 0
                : NAMEPLATE_OWNER_TEXT_GAP_PX * scale
                    + measureTextWidthPx(ownerFont, owner.name);

            return NAMEPLATE_OWNER_AVATAR_SIZE_PX * scale + ownerTextWidthPx;
        }),
        0,
    );
    const panelWidthPx = Math.max(
        NAMEPLATE_MIN_WIDTH_PX * scale,
        Math.max(nameWidthPx, ownerWidthPx) + inlinePaddingPx * 2,
    );
    const ownerRowsHeightPx = owners.length === 0
        ? 0
        : (
            owners.length * NAMEPLATE_OWNER_AVATAR_SIZE_PX
            + (owners.length - 1) * NAMEPLATE_OWNER_ROW_GAP_PX
        ) * scale;
    const ownerTopGapPx = owners.length === 0
        ? 0
        : NAMEPLATE_OWNER_TOP_GAP_PX * scale;
    const panelHeightPx = (
        blockPaddingPx
        + CHARACTER_NAME_FONT_SIZE_PX * scale
        + ownerTopGapPx
        + ownerRowsHeightPx
        + blockPaddingPx
    );
    const textureWidthPx = Math.ceil(panelWidthPx + shadowOutsetPx * 2);
    const textureHeightPx = Math.ceil(panelHeightPx + shadowOutsetPx * 2);

    return {
        name,
        owners,
        scale,
        nameFont,
        ownerFont,
        texture: {
            widthPx: textureWidthPx,
            heightPx: textureHeightPx,
        },
        panelRect: {
            x: shadowOutsetPx,
            y: shadowOutsetPx,
            width: textureWidthPx - shadowOutsetPx * 2,
            height: textureHeightPx - shadowOutsetPx * 2,
        },
        contentX: shadowOutsetPx + inlinePaddingPx,
        nameY: shadowOutsetPx + blockPaddingPx,
    };
};

const fontWithSize = (sizePx: number) => `${Math.max(1, sizePx)}px ${VIEWPORT_FONT_FAMILY}`;

const alignDevicePx = (
    value: number,
    pixelRatio: number,
) => Math.round(value * pixelRatio) / pixelRatio;

const drawNameplatePanel = (
    context: CanvasRenderingContext2D,
    rect: RectPx,
    radius: number,
    scale: number,
) => {
    context.save();
    context.shadowBlur = NAMEPLATE_SHADOW_BLUR_PX * scale;
    context.shadowColor = NAMEPLATE_SHADOW_COLOR;
    context.shadowOffsetY = NAMEPLATE_SHADOW_OFFSET_Y_PX * scale;
    context.fillStyle = NAMEPLATE_BG_COLOR;
    appendRoundedRectPath(context, rect, radius);
    context.fill();
    context.restore();

    context.save();
    context.lineWidth = NAMEPLATE_BORDER_WIDTH_PX * scale;
    context.strokeStyle = NAMEPLATE_BORDER_COLOR;
    appendRoundedRectPath(context, rect, radius);
    context.stroke();
    context.restore();
};

const appendRoundedRectPath = (
    context: CanvasRenderingContext2D,
    rect: RectPx,
    radius: number,
) => {
    const boundedRadius = Math.min(
        radius,
        rect.width * 0.5,
        rect.height * 0.5,
    );
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;

    context.beginPath();
    context.moveTo(rect.x + boundedRadius, rect.y);
    context.lineTo(right - boundedRadius, rect.y);
    context.quadraticCurveTo(right, rect.y, right, rect.y + boundedRadius);
    context.lineTo(right, bottom - boundedRadius);
    context.quadraticCurveTo(right, bottom, right - boundedRadius, bottom);
    context.lineTo(rect.x + boundedRadius, bottom);
    context.quadraticCurveTo(rect.x, bottom, rect.x, bottom - boundedRadius);
    context.lineTo(rect.x, rect.y + boundedRadius);
    context.quadraticCurveTo(rect.x, rect.y, rect.x + boundedRadius, rect.y);
    context.closePath();
};

const drawOwnerAvatar = async (
    context: CanvasRenderingContext2D,
    bitmap: ImageBitmap | null,
    rect: AvatarRectPx,
) => {
    const radius = rect.size * 0.5;
    const centerX = rect.x + radius;
    const centerY = rect.y + radius;

    context.save();
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.clip();

    if (bitmap === null) {
        context.fillStyle = NAMEPLATE_AVATAR_PLACEHOLDER_COLOR;
        context.fillRect(rect.x, rect.y, rect.size, rect.size);
    } else {
        const sourceSize = Math.min(bitmap.width, bitmap.height);
        const sourceX = (bitmap.width - sourceSize) * 0.5;
        const sourceY = (bitmap.height - sourceSize) * 0.5;

        context.drawImage(
            bitmap,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            rect.x,
            rect.y,
            rect.size,
            rect.size,
        );
    }

    context.restore();

    context.strokeStyle = NAMEPLATE_AVATAR_RING_COLOR;
    context.lineWidth = Math.max(1, rect.size / 18);
    context.beginPath();
    context.arc(centerX, centerY, radius - context.lineWidth * 0.5, 0, Math.PI * 2);
    context.stroke();
};

let textMeasureContext: CanvasRenderingContext2D | null = null;

const measureTextWidthPx = (
    font: string,
    text: string,
) => {
    if (typeof document === "undefined") return text.length * 16;

    if (textMeasureContext === null) {
        const canvas = document.createElement("canvas");
        textMeasureContext = canvas.getContext("2d");
    }

    if (textMeasureContext === null) return text.length * 16;

    textMeasureContext.font = font;
    return textMeasureContext.measureText(text).width;
};

const formatMeters = (value: number) => Number(value.toFixed(4)).toString();
