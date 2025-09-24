export class Character {
    imageSrc: string = $state()!;
    name: string = $state()!;

    constructor({
        imageSrc,
        name,
    }: {
        imageSrc: string,
        name: string,
    }) {
        this.imageSrc = imageSrc;
        this.name = name;
    }
}