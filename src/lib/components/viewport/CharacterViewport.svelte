<script lang="ts">
import {
    onDestroy,
    untrack,
} from "svelte";
import { Tween } from "svelte/motion";
import {
    centeredCameraPositionForCharacter,
    referenceCurveSignatureForCharacter,
    store,
} from "$lib/types/Store.svelte";
import {
    CAMERA_EASE_DURATION_MS,
    CAMERA_EASE_OPTIONS,
    cameraScaleFromTweenValue,
    cameraScaleToTweenValue,
} from "$lib/types/Camera2d.svelte";
import type { Character } from "$lib/types/Character.svelte";
import CharacterCanvas from "./CharacterCanvas.svelte";
import {
    buildCharacterRenderFrame,
    type CharacterRenderItem,
    type BaselinePreview,
    type CharacterRenderFrame,
} from "./characterRenderModel";
import type { Point } from "$lib/types/Point";
import {
    buildBaselinePoints,
    clampBaselinePoint,
    computeBaselineArcLength,
} from "$lib/util/baselineGeometry";
import {
    projectViewportYMeters,
    unprojectViewportYMeters,
} from "$lib/util/viewportProjection";

type DragState =
    | {
        kind: "pan",
        pointerId: number,
    }
    | {
        kind: "anchor",
        pointerId: number,
        item: CharacterRenderItem,
    }
    | {
        kind: "baseline",
        pointerId: number,
        item: CharacterRenderItem,
    }
    | null;

type FocusedReferenceCurve = {
    character: Character,
    signature: string,
};

type DragonscalerViewportDebugWindow = typeof window & {
    __dragonscalerViewportDebug?: {
        renderFrame: CharacterRenderFrame,
    },
};

let viewport: HTMLDivElement | undefined = $state();
let viewportWidth = $state(0);
let viewportHeight = $state(0);
let viewportLeft = $state(0);
let viewportTop = $state(0);
let dragState: DragState = $state(null);
let rawDrawPoints: Point[] = $state([]);
let focusedReferenceCurve: FocusedReferenceCurve | null = null;
let focusedProjectionCharacter: Character | null = $state(null);
let focusedProjectionTimeout: number | null = null;
const focusedScaleFacTween = new Tween(cameraScaleToTweenValue(1), {duration: 0});
const focusedScaleFac = $derived(cameraScaleFromTweenValue(focusedScaleFacTween.current));
const baselinePreview: BaselinePreview = $derived.by(() => {
    if (dragState?.kind !== "baseline") return null;

    return {
        character: dragState.item.character,
        points: buildBaselinePoints(
            store.characterManager.baselineEditMode,
            rawDrawPoints,
            {
                groundY: dragState.item.character.anchor.y,
            },
        ),
    };
});
const displayCharacters = $derived(store.characterManager.displayCharacters);
const logPerspective = $derived(store.characterManager.logPerspective);
const focusOffsetPx = $derived({
    x: (store.camera.viewportInsetsPx.left - store.camera.viewportInsetsPx.right) * 0.5,
    y: (store.camera.viewportInsetsPx.top - store.camera.viewportInsetsPx.bottom) * 0.5,
});
const projectionOverride = $derived.by(() => {
    if (focusedProjectionCharacter === null) return null;

    return {
        character: focusedProjectionCharacter,
        scaleFac: focusedScaleFac,
        centerXMeters: store.camera.posMetersX + focusOffsetPx.x / store.camera.scalePxPerMeter,
        centerProjectedYMeters: projectViewportYMeters(
            store.camera.posMetersY,
            logPerspective,
        ) - focusOffsetPx.y / store.camera.scalePxPerMeter,
    };
});

const clearFocusedProjectionTimeout = () => {
    if (focusedProjectionTimeout === null) return;

    clearTimeout(focusedProjectionTimeout);
    focusedProjectionTimeout = null;
};

const finishFocusedProjectionAfterEase = (character: Character) => {
    clearFocusedProjectionTimeout();

    focusedProjectionTimeout = setTimeout(
        () => {
            if (focusedProjectionCharacter === character) {
                focusedProjectionCharacter = null;
            }

            focusedProjectionTimeout = null;
        },
        CAMERA_EASE_DURATION_MS,
    );
};

onDestroy(clearFocusedProjectionTimeout);

$effect(() => {
    viewportWidth;
    viewportHeight;

    if (viewport === undefined) return;

    const rect = viewport.getBoundingClientRect();
    viewportLeft = rect.left;
    viewportTop = rect.top;
    store.camera.viewportDimsPx.width = rect.width;
    store.camera.viewportDimsPx.height = rect.height;
    store.camera.viewportPositionPx.x = rect.left + rect.width / 2;
    store.camera.viewportPositionPx.y = rect.top + rect.height / 2;
});

const renderFrame = $derived(buildCharacterRenderFrame({
    characters: displayCharacters,
    positionsX: store.characterManager.positionsX,
    camera: {
        posMetersX: store.camera.posMetersX,
        posMetersY: store.camera.posMetersY,
        scalePxPerMeter: store.camera.scalePxPerMeter,
        viewportPositionPx: {
            x: store.camera.viewportPositionPx.x - viewportLeft,
            y: store.camera.viewportPositionPx.y - viewportTop,
        },
    },
    widthPx: viewportWidth,
    heightPx: viewportHeight,
    editingCharacter: store.characterManager.editingCharacter,
    baselinePreview,
    projectionOverride,
    logPerspective,
    gridlinesOnTop: store.gridlinesOnTop,
}));

$effect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") return;

    (window as DragonscalerViewportDebugWindow).__dragonscalerViewportDebug = {
        renderFrame,
    };
});

const focusSelectedCharacter = (selected: Character) => {
    const index = displayCharacters.indexOf(selected);
    if (index === -1) return;

    const positionX = store.characterManager.positionsX[index];
    const viewportDimsPx = {
        width: store.camera.viewportDimsPx.width,
        height: store.camera.viewportDimsPx.height,
    };
    const viewportInsetsPx = {
        top: store.camera.viewportInsetsPx.top,
        right: store.camera.viewportInsetsPx.right,
        bottom: store.camera.viewportInsetsPx.bottom,
        left: store.camera.viewportInsetsPx.left,
    };
    const pos = centeredCameraPositionForCharacter({
        character: selected,
        positionX,
        viewportDimsPx,
        viewportInsetsPx,
        logPerspective,
    });

    store.camera.setPosMetersXWithEase(pos.x);
    store.camera.setPosMetersYWithEase(pos.y);
    store.camera.setScalePxPerMeterWithEase(pos.scalePxPerMeter);
};

$effect(() => {
    const selected = store.characterManager.selectedCharacter;
    if (selected === null) {
        focusedReferenceCurve = null;
        focusedProjectionCharacter = null;
        clearFocusedProjectionTimeout();
        return;
    }

    const signature = referenceCurveSignatureForCharacter(selected);
    const selectedChanged = focusedReferenceCurve?.character !== selected;
    const referenceCurveChanged = (
        !selectedChanged
        && focusedReferenceCurve?.signature !== signature
    );
    focusedReferenceCurve = {
        character: selected,
        signature,
    };

    if (!selectedChanged && !referenceCurveChanged) return;

    untrack(() => {
        if (referenceCurveChanged) {
            focusedProjectionCharacter = selected;
            finishFocusedProjectionAfterEase(selected);
        } else {
            focusedProjectionCharacter = null;
            clearFocusedProjectionTimeout();
        }

        focusedScaleFacTween.set(
            cameraScaleToTweenValue(selected.baseline.scaleFac),
            referenceCurveChanged ? CAMERA_EASE_OPTIONS : {duration: 0},
        );
        focusSelectedCharacter(selected);
    });
});

const viewportPointFromEvent = (event: PointerEvent): Point => {
    if (viewport === undefined) {
        return {
            x: 0,
            y: 0,
        };
    }

    const rect = viewport.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
};

const editingItem = () => renderFrame.items.find(item => item.editing) ?? null;

const baselinePointFromEvent = (
    event: PointerEvent,
    item: CharacterRenderItem,
): Point => {
    const point = viewportPointFromEvent(event);

    return clampBaselinePoint(
        {
            x: (point.x - item.rectPx.x) / item.rectPx.width * item.aspect,
            y: 1 - (point.y - item.rectPx.y) / item.rectPx.height,
        },
        item.aspect,
    );
};

const anchorPointPx = (item: CharacterRenderItem): Point => ({
    x: item.rectPx.x + item.character.anchor.x * item.rectPx.width,
    y: item.rectPx.y + (1 - item.character.anchor.y) * item.rectPx.height,
});

const pointInsideItem = (point: Point, item: CharacterRenderItem) => (
    point.x >= item.rectPx.x
    && point.x <= item.rectPx.x + item.rectPx.width
    && point.y >= item.rectPx.y
    && point.y <= item.rectPx.y + item.rectPx.height
);

const pointerNearAnchorControl = (
    point: Point,
    item: CharacterRenderItem,
) => {
    const anchor = anchorPointPx(item);
    return Math.hypot(
        point.x - anchor.x,
        point.y - anchor.y,
    ) <= 16;
};

const capturePointer = (event: PointerEvent) => {
    if (!(event.currentTarget instanceof HTMLElement)) return;

    event.currentTarget.setPointerCapture(event.pointerId);
};

const releasePointer = (event: PointerEvent) => {
    if (!(event.currentTarget instanceof HTMLElement)) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
};

const beginPointerDrag = (event: PointerEvent) => {
    if (event.button === 1) {
        event.preventDefault();
        capturePointer(event);
        dragState = {
            kind: "pan",
            pointerId: event.pointerId,
        };
        return;
    }

    if (event.button !== 0) return;

    const item = editingItem();
    if (item === null) return;

    const point = viewportPointFromEvent(event);
    if (!pointInsideItem(point, item)) return;

    event.preventDefault();
    capturePointer(event);

    if (pointerNearAnchorControl(point, item)) {
        dragState = {
            kind: "anchor",
            pointerId: event.pointerId,
            item,
        };
        return;
    }

    rawDrawPoints = [baselinePointFromEvent(event, item)];
    dragState = {
        kind: "baseline",
        pointerId: event.pointerId,
        item,
    };
};

const continuePointerDrag = (event: PointerEvent) => {
    if (dragState === null || dragState.pointerId !== event.pointerId) return;

    event.preventDefault();

    if (dragState.kind === "pan") {
        store.camera.setPosMetersX(store.camera.posMetersX - event.movementX / store.camera.scalePxPerMeter);
        store.camera.setPosMetersY(unprojectViewportYMeters(
            projectViewportYMeters(
                store.camera.posMetersY,
                logPerspective,
            ) + event.movementY / store.camera.scalePxPerMeter,
            logPerspective,
        ));
        return;
    }

    if (dragState.kind === "anchor") {
        const item = dragState.item;
        item.character.anchor = {
            x: Math.min(
                Math.max(item.character.anchor.x + event.movementX / item.rectPx.width, 0),
                1,
            ),
            y: Math.min(
                Math.max(item.character.anchor.y - event.movementY / item.rectPx.height, 0),
                1,
            ),
        };
        return;
    }

    const nextPoint = baselinePointFromEvent(event, dragState.item);
    rawDrawPoints = [
        ...rawDrawPoints,
        nextPoint,
    ];
};

const finishPointerDrag = (event: PointerEvent) => {
    if (dragState === null || dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    releasePointer(event);

    if (dragState.kind === "baseline") {
        const character = dragState.item.character;
        const points = buildBaselinePoints(
            store.characterManager.baselineEditMode,
            rawDrawPoints,
            {
                groundY: character.anchor.y,
            },
        );

        if (computeBaselineArcLength(points) > 0) {
            character.baseline.points = points;
        }
    }

    rawDrawPoints = [];
    dragState = null;
};
</script>

<div
    class="character-viewport"
    role="application"
    aria-label="Character height chart viewport"
    bind:this={viewport}
    bind:clientWidth={viewportWidth}
    bind:clientHeight={viewportHeight}
    onpointerdown={beginPointerDrag}
    onpointermove={continuePointerDrag}
    onpointerup={finishPointerDrag}
    onpointercancel={finishPointerDrag}
    onwheel={event => {
        const mouseX = event.clientX - store.camera.viewportPositionPx.x;
        const mouseY = event.clientY - store.camera.viewportPositionPx.y;

        const worldX = store.camera.posMetersX + mouseX / store.camera.scalePxPerMeter;
        const projectedWorldY = projectViewportYMeters(
            store.camera.posMetersY,
            logPerspective,
        ) - mouseY / store.camera.scalePxPerMeter;

        const scaleFac = 2 ** (-event.deltaY * 0.001);
        store.camera.setScalePxPerMeter(store.camera.scalePxPerMeter * scaleFac);

        store.camera.setPosMetersX(worldX - mouseX / store.camera.scalePxPerMeter);
        store.camera.setPosMetersY(unprojectViewportYMeters(
            projectedWorldY + mouseY / store.camera.scalePxPerMeter,
            logPerspective,
        ));
    }}
>
    <CharacterCanvas frame={renderFrame} />
</div>

<style lang="scss">
.character-viewport {
    grid-area: 1/1;

    position: relative;
    overflow: hidden;

    display: grid;
    place-items: stretch;
    touch-action: none;
    
    > :global(*) {
        grid-area: 1/1;
    }
}
</style>
