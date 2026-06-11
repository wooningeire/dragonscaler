import type { Character } from "$lib/types/Character.svelte";
import type { CharacterImage } from "$lib/types/CharacterImage.svelte";
import type { IdentitySummary } from "$lib/types/Identity";
import type { Point } from "$lib/types/Point";


export type RectPx = {
    x: number,
    y: number,
    width: number,
    height: number,
};

export type CharacterRenderItem = {
    character: Character,
    image: CharacterImage | null,
    flippedHorizontally: boolean,
    name: string,
    owners: IdentitySummary[],
    rectPx: RectPx,
    baselinePoints: Point[],
    aspect: number,
    opacity: number,
    baselineOpacity: number,
    labelOpacity: number,
    mutedByEditMode: boolean,
    editing: boolean,
};

export type GridlineRenderItem = {
    orientation: "x" | "y",
    offsetPx: number,
    coordMeters: number,
    weight: "light" | "strong" | "origin",
};

export type CharacterRenderFrame = {
    widthPx: number,
    heightPx: number,
    gridlineStepMeters: number,
    gridlines: GridlineRenderItem[],
    items: CharacterRenderItem[],
};

export type CharacterRenderCamera = {
    posMetersX: number,
    posMetersY: number,
    scalePxPerMeter: number,
    viewportPositionPx: Point,
};

export type BaselinePreview = {
    character: Character,
    points: Point[],
} | null;

const EDIT_MUTED_OPACITY = 0.3333333;
const BASELINE_OPACITY = 0.3333333;
const LABEL_TARGET_SCALE_PX = 256;
const TARGET_GRIDLINE_STEP_PX = 144;

export const buildCharacterRenderFrame = ({
    characters,
    positionsX,
    camera,
    widthPx,
    heightPx,
    editingCharacter,
    baselinePreview = null,
}: {
    characters: Character[],
    positionsX: number[],
    camera: CharacterRenderCamera,
    widthPx: number,
    heightPx: number,
    editingCharacter: Character | null,
    baselinePreview?: BaselinePreview,
}): CharacterRenderFrame => {
    const gridlineStepMeters = 2 ** Math.round(-Math.log2(camera.scalePxPerMeter / TARGET_GRIDLINE_STEP_PX));
    const gridlines = buildGridlines({
        camera,
        widthPx,
        heightPx,
        gridlineStepMeters,
    });
    const items = characters.map((character, index) => {
        const height = character.baseline.scaleFac * camera.scalePxPerMeter;
        const width = height * character.aspect;
        const groundY = camera.viewportPositionPx.y + camera.posMetersY * camera.scalePxPerMeter;
        const mutedByEditMode = editingCharacter !== null && editingCharacter !== character;
        const editing = editingCharacter === character;
        const opacity = mutedByEditMode ? EDIT_MUTED_OPACITY : 1;
        const characterViewportScale = camera.scalePxPerMeter * character.baseline.scaleFac;
        const labelOpacity = Math.exp(-((Math.log(characterViewportScale / LABEL_TARGET_SCALE_PX)) ** 2));

        return {
            character,
            image: character.image,
            flippedHorizontally: character.image?.flippedHorizontally ?? false,
            name: character.name,
            owners: character.ownerIdentities,
            rectPx: {
                x: camera.viewportPositionPx.x + (positionsX[index] - camera.posMetersX) * camera.scalePxPerMeter,
                y: groundY + (character.anchor.y - 1) * height,
                width,
                height,
            },
            baselinePoints: baselinePreview?.character === character
                ? baselinePreview.points
                : character.baseline.points,
            aspect: character.aspect,
            opacity,
            baselineOpacity: BASELINE_OPACITY * opacity,
            labelOpacity,
            mutedByEditMode,
            editing,
        };
    });

    return {
        widthPx,
        heightPx,
        gridlineStepMeters,
        gridlines,
        items: items.toReversed(),
    };
};

const buildGridlines = ({
    camera,
    widthPx,
    heightPx,
    gridlineStepMeters,
}: {
    camera: CharacterRenderCamera,
    widthPx: number,
    heightPx: number,
    gridlineStepMeters: number,
}) => {
    const boundsMeters = {
        left: camera.posMetersX - widthPx * 0.5 / camera.scalePxPerMeter,
        right: camera.posMetersX + widthPx * 0.5 / camera.scalePxPerMeter,
        bottom: camera.posMetersY - heightPx * 0.5 / camera.scalePxPerMeter,
        top: camera.posMetersY + heightPx * 0.5 / camera.scalePxPerMeter,
    };
    const gridlines: GridlineRenderItem[] = [];

    let xMeters = Math.floor(boundsMeters.left / gridlineStepMeters) * gridlineStepMeters;
    while (xMeters < boundsMeters.right) {
        gridlines.push({
            orientation: "x",
            offsetPx: camera.viewportPositionPx.x + (xMeters - camera.posMetersX) * camera.scalePxPerMeter,
            coordMeters: xMeters,
            weight: "light",
        });
        xMeters += gridlineStepMeters;
    }

    let yMeters = Math.floor(boundsMeters.bottom / gridlineStepMeters) * gridlineStepMeters;
    while (yMeters < boundsMeters.top) {
        gridlines.push({
            orientation: "y",
            offsetPx: camera.viewportPositionPx.y - (yMeters - camera.posMetersY) * camera.scalePxPerMeter,
            coordMeters: yMeters,
            weight: Math.abs(yMeters) < 1e-4 ? "origin" : "strong",
        });
        yMeters += gridlineStepMeters;
    }

    return gridlines;
};
