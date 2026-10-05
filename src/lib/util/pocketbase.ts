import { PUBLIC__POCKETBASE_URL } from "$app/env/public";


export type PocketBaseFileUrlInput = { 
    collection: string;
    recordId: string;
    filename: string;
    thumb?: string | null
 };


export const CHARACTER_IMAGE_THUMB_SIZE = "0x1024";

export const pocketbaseUrl = PUBLIC__POCKETBASE_URL.replace(/\/+$/, ""); // no trailing slashes


export const getPocketBaseFileUrlForBase = (
    baseUrl: string,
    {
        collection,
        recordId,
        filename,
        thumb,
    }: PocketBaseFileUrlInput,
) => {
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
    const filePath = [
        "api",
        "files",
        collection,
        recordId,
        filename,
    ].map(encodeURIComponent).join("/");

    const url = `${normalizedBaseUrl}/${filePath}`;
    if (thumb !== undefined && thumb !== null && thumb !== "") {
        const searchParams = new URLSearchParams({ thumb });
        return `${url}?${searchParams.toString()}`;
    }

    return url;
};


export const getPocketbaseFileUrl = (input: PocketBaseFileUrlInput) => getPocketBaseFileUrlForBase(
    pocketbaseUrl,
    input,
);
