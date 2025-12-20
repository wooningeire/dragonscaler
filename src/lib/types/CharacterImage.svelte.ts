export type Dimensions = {
    width: number,
    height: number,
};

export class CharacterImage {
    readonly src: string;
    readonly file: File;
    readonly dimensions: Dimensions;
    readonly hasObjectUrl: boolean;
    
    get aspect() {
        return this.dimensions.width / this.dimensions.height;
    }

    constructor({
        src,
        file,
        dimensions,
        hasObjectUrl = false,
    }: {
        src: string,
        file: File,
        dimensions: Dimensions,
        hasObjectUrl?: boolean,
    }) {
        this.src = src;
        this.file = file;
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
                    file,
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

    static fromUrl(url: string, filename: string) {
        return new Promise<CharacterImage>(async resolve => {
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], filename);
            
            const img = new Image();
            img.addEventListener("load", () => {
                resolve(new CharacterImage({
                    src: url,
                    file,
                    dimensions: {
                        width: img.width,
                        height: img.height,
                    },
                    hasObjectUrl: false,
                }));
            });
            img.src = url;
        });
    }
}