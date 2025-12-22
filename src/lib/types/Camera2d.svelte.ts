export class Camera2d {
    scalePxPerMeter = $state(144);
    /**
     * (0, 0) => origin at center of viewport
     */
    posMeters = $state({x: 0, y: 0});

    viewportDimsPx = $state({width: 0, height: 0});
    readonly screenBoundsMeters = $derived({
        left: this.posMeters.x - this.viewportDimsPx.width * 0.5 / this.scalePxPerMeter,
        right: this.posMeters.x + this.viewportDimsPx.width * 0.5 / this.scalePxPerMeter,
        bottom: this.posMeters.y - this.viewportDimsPx.height * 0.5 / this.scalePxPerMeter,
        top: this.posMeters.y + this.viewportDimsPx.height * 0.5 / this.scalePxPerMeter,
    });

    xMetersAsScreenPx(xMeters: number) {
        return this.viewportDimsPx.width / 2 + (xMeters - this.posMeters.x) * this.scalePxPerMeter;
    }

    yMetersAsScreenPx(yMeters: number) {
        // if pos = (0, 0):
        // 0 -> viewport.height / 2
        // 1 -> viewport.height / 2 + scalePxPerMeter

        return this.viewportDimsPx.height / 2 + (yMeters - this.posMeters.y) * this.scalePxPerMeter;
    }
}