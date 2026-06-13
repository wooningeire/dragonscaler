import { quadInOut } from "svelte/easing";
import { Tween } from "svelte/motion";


export const CAMERA_EASE_DURATION_MS = 500;
export const CAMERA_EASE_OPTIONS = {
    duration: CAMERA_EASE_DURATION_MS,
    easing: quadInOut,
};

const SCALE_EXP = 8;
const SCALE_EXP_LOG = Math.log2(SCALE_EXP);

export const cameraScaleToTweenValue = (scale: number) => Math.log2(scale) / SCALE_EXP_LOG;
export const cameraScaleFromTweenValue = (value: number) => SCALE_EXP ** value;

export class Camera2d {
    private readonly scalePxPerMeterTween = new Tween(cameraScaleToTweenValue(72), {duration: 0});
    readonly scalePxPerMeter = $derived(cameraScaleFromTweenValue(this.scalePxPerMeterTween.current));

    setScalePxPerMeterWithEase(scalePxPerMeter: number) {
        this.scalePxPerMeterTween.set(
            cameraScaleToTweenValue(scalePxPerMeter),
            CAMERA_EASE_OPTIONS,
        );
    }
    setScalePxPerMeter(scalePxPerMeter: number) {
        this.scalePxPerMeterTween.set(cameraScaleToTweenValue(scalePxPerMeter));
    }

    private readonly posMetersXTween = new Tween(0, {duration: 0});
    private readonly posMetersYTween = new Tween(2, {duration: 0});
    /**
     * (0, 0) => origin at center of viewport
     */
    readonly posMetersX = $derived(this.posMetersXTween.current);
    readonly posMetersY = $derived(this.posMetersYTween.current);

    setPosMetersXWithEase(posMetersX: number) {
        this.posMetersXTween.set(
            posMetersX,
            CAMERA_EASE_OPTIONS,
        );
    }
    setPosMetersYWithEase(posMetersY: number) {
        this.posMetersYTween.set(
            posMetersY,
            CAMERA_EASE_OPTIONS,
        );
    }

    setPosMetersX(posMetersX: number) {
        this.posMetersXTween.set(posMetersX);
    }
    setPosMetersY(posMetersY: number) {
        this.posMetersYTween.set(posMetersY);
    }

    viewportDimsPx = $state({width: 0, height: 0});
    viewportPositionPx = $state({x: 0, y: 0});
    viewportInsetsPx = $state({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    });
    readonly screenBoundsMeters = $derived({
        left: this.posMetersX - this.viewportDimsPx.width * 0.5 / this.scalePxPerMeter,
        right: this.posMetersX + this.viewportDimsPx.width * 0.5 / this.scalePxPerMeter,
        bottom: this.posMetersY - this.viewportDimsPx.height * 0.5 / this.scalePxPerMeter,
        top: this.posMetersY + this.viewportDimsPx.height * 0.5 / this.scalePxPerMeter,
    });

    xMetersAsScreenPx(xMeters: number) {
        return this.viewportPositionPx.x + (xMeters - this.posMetersX) * this.scalePxPerMeter;
    }

    yMetersAsScreenPx(yMeters: number) {
        // if pos = (0, 0):
        // 0 -> viewport.height / 2
        // 1 -> viewport.height / 2 - scalePxPerMeter (World Up -> Screen Up/Top)

        return this.viewportPositionPx.y - (yMeters - this.posMetersY) * this.scalePxPerMeter;
    }
}
