export type Dimensions = {
    width: number,
    height: number,
};

export class CharacterImage {
    readonly src: string;
    readonly file: File;
    readonly dimensions: Dimensions;
    readonly hasObjectUrl: boolean;
    readonly flippedHorizontally: boolean;
    
    get aspect() {
        return this.dimensions.width / this.dimensions.height;
    }

    constructor({
        src,
        file,
        dimensions,
        hasObjectUrl = false,
        flippedHorizontally = false,
    }: {
        src: string,
        file: File,
        dimensions: Dimensions,
        hasObjectUrl?: boolean,
        flippedHorizontally?: boolean,
    }) {
        this.src = src;
        this.file = file;
        this.dimensions = dimensions;
        this.hasObjectUrl = hasObjectUrl;
        this.flippedHorizontally = flippedHorizontally;
    }

    static async fromFile(file: File) {
        const dimensions = await loadImageDimensions(file);
        const url = URL.createObjectURL(file);

        return new CharacterImage({
            src: url,
            file,
            dimensions,
            hasObjectUrl: true,
        });
    }

    static async fromUrl(
        url: string,
        filename: string,
        {
            flippedHorizontally = false,
            dimensions = null,
        }: {
            flippedHorizontally?: boolean,
            dimensions?: Dimensions | null,
        } = {},
    ) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch image.");
        }

        const blob = await response.blob();
        const file = new File([blob], filename);
        const resolvedDimensions = isValidDimensions(dimensions)
            ? dimensions
            : await loadImageDimensions(file);

        return new CharacterImage({
            src: url,
            file,
            dimensions: resolvedDimensions,
            hasObjectUrl: false,
            flippedHorizontally,
        });
    }

    withFlippedHorizontally(flippedHorizontally: boolean) {
        return new CharacterImage({
            src: this.src,
            file: this.file,
            dimensions: this.dimensions,
            hasObjectUrl: this.hasObjectUrl,
            flippedHorizontally,
        });
    }
}

const isValidDimensions = (dimensions: Dimensions | null): dimensions is Dimensions => (
    dimensions !== null
    && dimensions.width > 0
    && dimensions.height > 0
);

const loadImageDimensions = async (source: ImageBitmapSource) => {
    const bitmap = await createImageBitmap(source);

    try {
        return {
            width: bitmap.width,
            height: bitmap.height,
        };
    } finally {
        bitmap.close();
    }
};
