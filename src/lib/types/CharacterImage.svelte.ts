export type Dimensions = {
    width: number,
    height: number,
};

export class CharacterImage {
    readonly src: string;
    readonly dimensions: Dimensions;
    readonly hasObjectUrl: boolean;
    
    get aspect() {
        return this.dimensions.width / this.dimensions.height;
    }

    constructor({
        src,
        dimensions,
        hasObjectUrl = false,
    }: {
        src: string,
        dimensions: Dimensions,
        hasObjectUrl?: boolean,
    }) {
        this.src = src;
        this.dimensions = dimensions;
        this.hasObjectUrl = hasObjectUrl;
    }

    static fromFile(file: File) {
        return new Promise<CharacterImage>(resolve => {
            const url = URL.createObjectURL(file);

            const img = new Image();
            img.addEventListener("load", () => {
                resolve(new CharacterImage({
                    src: url,
                    dimensions: {
                        width: img.width,
                        height: img.height,
                    },
                    hasObjectUrl: true,
                }));
            });
            img.src = url;
        });
    }
}