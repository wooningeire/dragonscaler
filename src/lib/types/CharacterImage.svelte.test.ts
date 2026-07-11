import {
    afterEach,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";
import { CharacterImage } from "./CharacterImage.svelte";


const imageBlob = new Blob(["image"], {
    type: "image/png",
});
const fetchImage = vi.fn();
const decodeImage = vi.fn();
const closeImage = vi.fn();
const createObjectUrl = vi.fn();

const makeResponse = (
    loadBlob = vi.fn().mockResolvedValue(imageBlob),
    ok = true,
) => ({
    ok,
    blob: loadBlob,
}) as unknown as Response;

describe("CharacterImage", () => {
    beforeEach(() => {
        fetchImage.mockReset();
        fetchImage.mockResolvedValue(makeResponse());
        closeImage.mockReset();
        decodeImage.mockReset();
        decodeImage.mockResolvedValue({
            width: 640,
            height: 480,
            close: closeImage,
        } as unknown as ImageBitmap);
        createObjectUrl.mockReset();
        createObjectUrl.mockReturnValue("blob:character");

        vi.stubGlobal("fetch", fetchImage);
        vi.stubGlobal("createImageBitmap", decodeImage);
        vi.stubGlobal("URL", {
            createObjectURL: createObjectUrl,
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("decodes file dimensions before creating its object URL", async () => {
        const file = new File(["image"], "character.png", {
            type: "image/png",
        });

        const image = await CharacterImage.fromFile(file);

        expect(decodeImage).toHaveBeenCalledWith(file);
        expect(closeImage).toHaveBeenCalledTimes(1);
        expect(createObjectUrl).toHaveBeenCalledWith(file);
        expect(image.file).toBe(file);
        expect(image).toMatchObject({
            src: "blob:character",
            dimensions: {
                width: 640,
                height: 480,
            },
            hasObjectUrl: true,
            flippedHorizontally: false,
        });
    });

    test("uses stored dimensions without decoding the remote image", async () => {
        const dimensions = {
            width: 1200,
            height: 800,
        };

        const image = await CharacterImage.fromUrl(
            "https://example.test/character.png",
            "character.png",
            {
                flippedHorizontally: true,
                dimensions,
            },
        );

        expect(fetchImage).toHaveBeenCalledWith("https://example.test/character.png");
        expect(image.dimensions).toBe(dimensions);
        expect(image.flippedHorizontally).toBe(true);
        expect(image.hasObjectUrl).toBe(false);
        expect(image.file.name).toBe("character.png");
        expect(decodeImage).not.toHaveBeenCalled();
    });

    test("loads remote dimensions when none are stored", async () => {
        const image = await CharacterImage.fromUrl(
            "https://example.test/character.png",
            "character.png",
        );

        expect(image.dimensions).toEqual({
            width: 640,
            height: 480,
        });
        expect(decodeImage).toHaveBeenCalledWith(expect.any(File));
        expect((decodeImage.mock.calls[0]?.[0] as File).name).toBe("character.png");
        expect(closeImage).toHaveBeenCalledTimes(1);
    });

    test("rejects failed responses before reading their body", async () => {
        const loadBlob = vi.fn();
        fetchImage.mockResolvedValue(makeResponse(loadBlob, false));

        await expect(CharacterImage.fromUrl(
            "https://example.test/missing.png",
            "missing.png",
        )).rejects.toThrow("Failed to fetch image.");
        expect(loadBlob).not.toHaveBeenCalled();
    });

    test("propagates fetch and blob failures", async () => {
        fetchImage.mockRejectedValueOnce(new Error("Network unavailable."));

        await expect(CharacterImage.fromUrl(
            "https://example.test/network-error.png",
            "network-error.png",
        )).rejects.toThrow("Network unavailable.");

        const loadBlob = vi.fn().mockRejectedValue(new Error("Body unavailable."));
        fetchImage.mockResolvedValueOnce(makeResponse(loadBlob));

        await expect(CharacterImage.fromUrl(
            "https://example.test/body-error.png",
            "body-error.png",
        )).rejects.toThrow("Body unavailable.");
    });

    test("propagates decode failures before creating local object URLs", async () => {
        decodeImage.mockRejectedValue(new Error("Decode failed."));

        await expect(CharacterImage.fromUrl(
            "https://example.test/invalid.png",
            "invalid.png",
        )).rejects.toThrow("Decode failed.");

        const file = new File(["invalid"], "invalid.png", {
            type: "image/png",
        });

        await expect(CharacterImage.fromFile(file)).rejects.toThrow(
            "Decode failed.",
        );
        expect(createObjectUrl).not.toHaveBeenCalled();
    });
});
