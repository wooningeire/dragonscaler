<script lang="ts">
import {
    onDestroy,
    untrack,
} from "svelte";
import { Tween } from "svelte/motion";
import {
    centeredCameraPositionForCharacter,
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
    type ShoulderPreview,
} from "./characterRenderModel";
import type { Point } from "$lib/types/Point";
import {
    buildBaselinePoints,
    clampBaselinePoint,
    computeBaselineArcLength,
} from "$lib/util/baselineGeometry";
import {
    characterProjectionMetrics,
    projectViewportYMeters,
    unprojectViewportYMeters,
} from "$lib/util/viewportProjection";
import { normalizeShoulderY } from "$lib/util/shoulderAltitude";

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
    | {
        kind: "shoulder",
        pointerId: number,
        item: CharacterRenderItem,
    }
    | null;

type FocusedCharacterGeometry = {
    character: Character,
    scaleFac: number,
    shoulderY: number | null,
};

type DragonscalerViewportDebugWindow = typeof window & {
    __dragonscalerViewportDebug?: {
        renderFrame: CharacterRenderFrame,
    },
};

const MIN_SHOULDER_IMAGE_ALTITUDE = 1e-3;

let viewport: HTMLDivElement | undefined = $state();
let viewportWidth = $state(0);
let viewportHeight = $state(0);
let viewportLeft = $state(0);
let viewportTop = $state(0);
let dragState: DragState = $state(null);
let rawDrawPoints: Point[] = $state([]);
let focusedCharacterGeometry: FocusedCharacterGeometry | null = null;
let shoulderPreviewY: number | null = $state(null);
let focusedProjectionCharacter: Character | null = $state(null);
let focusedProjectionTimeout: number | null = null;
const focusedProjectedHeightTween = new Tween(cameraScaleToTweenValue(1), {duration: 0});
const focusedProjectedHeight = $derived(cameraScaleFromTweenValue(focusedProjectedHeightTween.current));
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
const shoulderPreview: ShoulderPreview = $derived.by(() => {
    if (dragState?.kind !== "shoulder" || shoulderPreviewY === null) return null;

    return {
        character: dragState.item.character,
        y: shoulderPreviewY,
    };
});
const shoulderMarkStatus = $derived.by(() => {
    if (!store.characterManager.shoulderMarkingActive) return "";

    const character = store.characterManager.editingCharacter;
    const shoulderY = character?.validShoulderY ?? null;
    if (shoulderY === null) return "Shoulder mark not set.";

    const percentFromImageBottom = Math.round(shoulderY * 1_000) / 10;

    return `Shoulder mark ${percentFromImageBottom}% from image bottom.`;
});

const logPerspective = $derived(store.characterManager.logPerspective);
const focusOffsetPx = $derived({
    x: (store.camera.viewportInsetsPx.left - store.camera.viewportInsetsPx.right) * 0.5,
    y: (store.camera.viewportInsetsPx.top - store.camera.viewportInsetsPx.bottom) * 0.5,
});
const projectionOverride = $derived.by(() => {
    if (focusedProjectionCharacter === null) return null;

    return {
        character: focusedProjectionCharacter,
        projectedHeightMeters: focusedProjectedHeight,
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

$effect(() => {
    if (!store.characterManager.shoulderMarkingActive || viewport === undefined) return;

    const viewportElement = viewport;
    untrack(() => {
        viewportElement.focus();
    });
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
    shoulderPreview,
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
        focusedCharacterGeometry = null;
        focusedProjectionCharacter = null;
        clearFocusedProjectionTimeout();
        return;
    }

    const scaleFac = selected.scaleFac;
    const shoulderY = selected.validShoulderY;
    const selectedChanged = focusedCharacterGeometry?.character !== selected;
    const scaleChanged = (
        !selectedChanged
        && !Object.is(
            focusedCharacterGeometry?.scaleFac,
            scaleFac,
        )
    );
    const shoulderChanged = (
        !selectedChanged
        && !Object.is(
            focusedCharacterGeometry?.shoulderY,
            shoulderY,
        )
    );
    const projectionChanged = scaleChanged || shoulderChanged;
    focusedCharacterGeometry = {
        character: selected,
        scaleFac,
        shoulderY,
    };

    if (!selectedChanged && !projectionChanged) return;

    untrack(() => {
        if (projectionChanged) {
            focusedProjectionCharacter = selected;
            finishFocusedProjectionAfterEase(selected);
        } else {
            focusedProjectionCharacter = null;
            clearFocusedProjectionTimeout();
        }

        const projectedHeightMeters = characterProjectionMetrics(
            selected,
            logPerspective,
        ).height;

        focusedProjectedHeightTween.set(
            cameraScaleToTweenValue(projectedHeightMeters),
            projectionChanged ? CAMERA_EASE_OPTIONS : {duration: 0},
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

const shoulderYFromEvent = (
    event: PointerEvent,
    item: CharacterRenderItem,
) => {
    const groundY = item.character.anchor.y;
    if (
        !Number.isFinite(groundY)
        || groundY < 0
        || groundY >= 1
        || item.rectPx.height <= 0
    ) {
        return null;
    }

    const minimumY = Math.min(
        groundY + MIN_SHOULDER_IMAGE_ALTITUDE,
        1,
    );
    const point = viewportPointFromEvent(event);
    const imageY = 1 - (point.y - item.rectPx.y) / item.rectPx.height;

    return Math.min(
        Math.max(
            imageY,
            minimumY,
        ),
        1,
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

    if (store.characterManager.shoulderMarkingActive) {
        const shoulderY = shoulderYFromEvent(event, item);
        if (shoulderY === null) {
            releasePointer(event);
            return;
        }

        shoulderPreviewY = shoulderY;
        dragState = {
            kind: "shoulder",
            pointerId: event.pointerId,
            item,
        };
        return;
    }

    if (item.character.baseline.referenceSizingMethod === "pixel_measurement") return;

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
        const character = item.character;
        character.anchor = {
            x: Math.min(
                Math.max(character.anchor.x + event.movementX / item.rectPx.width, 0),
                1,
            ),
            y: Math.min(
                Math.max(character.anchor.y - event.movementY / item.rectPx.height, 0),
                1,
            ),
        };
        character.shoulderY = normalizeShoulderY({
            shoulderY: character.shoulderY,
            groundY: character.anchor.y,
        });
        return;
    }

    if (dragState.kind === "shoulder") {
        const shoulderY = shoulderYFromEvent(
            event,
            dragState.item,
        );
        if (shoulderY !== null) {
            shoulderPreviewY = shoulderY;
        }
        return;
    }

    const nextPoint = baselinePointFromEvent(event, dragState.item);
    rawDrawPoints = [
        ...rawDrawPoints,
        nextPoint,
    ];
};

const clearPointerDrag = (event: PointerEvent) => {
    event.preventDefault();
    releasePointer(event);
    rawDrawPoints = [];
    shoulderPreviewY = null;
    dragState = null;
};


const finishPointerDrag = (event: PointerEvent) => {
    if (dragState === null || dragState.pointerId !== event.pointerId) return;

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

    if (dragState.kind === "shoulder" && shoulderPreviewY !== null) {
        dragState.item.character.shoulderY = shoulderPreviewY;
    }

    clearPointerDrag(event);
};

const cancelPointerDrag = (event: PointerEvent) => {
    if (dragState === null || dragState.pointerId !== event.pointerId) return;

    clearPointerDrag(event);
};

const adjustShoulderMark = (event: KeyboardEvent) => {
    if (!store.characterManager.shoulderMarkingActive) return;

    const character = store.characterManager.editingCharacter;
    if (character === null) return;

    const groundY = character.anchor.y;
    if (
        !Number.isFinite(groundY)
        || groundY < 0
        || groundY >= 1
    ) return;

    const minimumY = Math.min(groundY + MIN_SHOULDER_IMAGE_ALTITUDE, 1);

    const currentY = character.validShoulderY ?? Math.min(
        Math.max(0.75, minimumY),
        1,
    );
    const step = event.shiftKey ? 0.1 : 0.01;
    let shoulderY = currentY;

    if (event.key === "ArrowUp") {
        shoulderY += step;
    } else if (event.key === "ArrowDown") {
        shoulderY -= step;
    } else if (event.key === "PageUp") {
        shoulderY += 0.1;
    } else if (event.key === "PageDown") {
        shoulderY -= 0.1;
    } else if (event.key === "Home") {
        shoulderY = minimumY;
    } else if (event.key === "End") {
        shoulderY = 1;
    } else {
        return;
    }

    event.preventDefault();
    character.shoulderY = Math.min(
        Math.max(shoulderY, minimumY),
        1,
    );
};
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (The viewport is an interactive canvas.) -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions (The viewport supports pointer, wheel, and keyboard input.) -->
<div
    class="character-viewport"
    class:shoulder-marking-active={store.characterManager.shoulderMarkingActive}
    role="application"
    aria-label={store.characterManager.shoulderMarkingActive
        ? "Character height chart viewport. Shoulder marking active. Use arrow keys to adjust the mark."
        : "Character height chart viewport"}
    aria-keyshortcuts={store.characterManager.shoulderMarkingActive
        ? "ArrowUp ArrowDown PageUp PageDown Home End"
        : undefined}
    tabindex="0"
    bind:this={viewport}
    bind:clientWidth={viewportWidth}
    bind:clientHeight={viewportHeight}
    onpointerdown={beginPointerDrag}
    onpointermove={continuePointerDrag}
    onpointerup={finishPointerDrag}
    onpointercancel={cancelPointerDrag}
    onkeydown={adjustShoulderMark}
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

{#if store.characterManager.shoulderMarkingActive}
    <span
        class="shoulder-mark-status"
        role="status"
        aria-label="Shoulder mark status"
        aria-atomic="true"
    >
        {shoulderMarkStatus}
    </span>

{/if}

<style lang="scss">
.shoulder-mark-status {
    position: fixed;
    width: 0.0625rem;
    height: 0.0625rem;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}


.character-viewport {
    grid-area: 1/1;

    position: relative;
    overflow: hidden;

    display: grid;
    place-items: stretch;
    touch-action: none;

    &.shoulder-marking-active {
        cursor: crosshair;
    }

    > :global(*) {
        grid-area: 1/1;
    }
}
</style>
