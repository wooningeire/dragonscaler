import { quadInOut, sineInOut } from "svelte/easing";
import { Tween } from "svelte/motion";


const DURATION = 1_500;
const SCALE_EXP = 8;
const SCALE_EXP_LOG = Math.log2(SCALE_EXP);

export class Camera2d {
    private readonly scalePxPerMeterTween = new Tween(Math.log2(144) / SCALE_EXP_LOG, {duration: 0});
    readonly scalePxPerMeter = $derived(SCALE_EXP ** this.scalePxPerMeterTween.current);

    setScalePxPerMeterWithEase(scalePxPerMeter: number) {
        this.scalePxPerMeterTween.set(Math.log2(scalePxPerMeter) / SCALE_EXP_LOG, {duration: DURATION, easing: quadInOut});
    }
    setScalePxPerMeter(scalePxPerMeter: number) {
        this.scalePxPerMeterTween.set(Math.log2(scalePxPerMeter) / SCALE_EXP_LOG);
    }

    private readonly posMetersXTween = new Tween(0, {duration: 0});
    private readonly posMetersYTween = new Tween(0, {duration: 0});
    /**
     * (0, 0) => origin at center of viewport
     */
    readonly posMetersX = $derived(this.posMetersXTween.current);
    readonly posMetersY = $derived(this.posMetersYTween.current);

    setPosMetersXWithEase(posMetersX: number) {
        this.posMetersXTween.set(posMetersX, {duration: DURATION, easing: quadInOut});
    }
    setPosMetersYWithEase(posMetersY: number) {
        this.posMetersYTween.set(posMetersY, {duration: DURATION, easing: quadInOut});
    }

    setPosMetersX(posMetersX: number) {
        this.posMetersXTween.set(posMetersX);
    }
    setPosMetersY(posMetersY: number) {
        this.posMetersYTween.set(posMetersY);
    }

    viewportDimsPx = $state({width: 0, height: 0});
    readonly screenBoundsMeters = $derived({
        left: this.posMetersX - this.viewportDimsPx.width * 0.5 / this.scalePxPerMeter,
        right: this.posMetersX + this.viewportDimsPx.width * 0.5 / this.scalePxPerMeter,
        bottom: this.posMetersY - this.viewportDimsPx.height * 0.5 / this.scalePxPerMeter,
        top: this.posMetersY + this.viewportDimsPx.height * 0.5 / this.scalePxPerMeter,
    });

    xMetersAsScreenPx(xMeters: number) {
        return this.viewportDimsPx.width / 2 + (xMeters - this.posMetersX) * this.scalePxPerMeter;
    }

    yMetersAsScreenPx(yMeters: number) {
        // if pos = (0, 0):
        // 0 -> viewport.height / 2
        // 1 -> viewport.height / 2 + scalePxPerMeter

        return this.viewportDimsPx.height / 2 + (yMeters - this.posMetersY) * this.scalePxPerMeter;
    }
}