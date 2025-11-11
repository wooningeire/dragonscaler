
export enum GridlineWeight {
    Light,
    Strong,
    Origin,
}
export type Gridline = {
    offsetPx: number,
    coordMeters: number,
    weight: GridlineWeight,
};