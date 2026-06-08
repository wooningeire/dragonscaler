import { PUBLIC__POCKETBASE_URL } from "$env/static/public";


type PocketBaseFileUrlInput = {
    collection: string,
    recordId: string,
    filename: string,
};


export const pocketbaseUrl = PUBLIC__POCKETBASE_URL.replace(/\/+$/, ""); // no trailing slashes


export const getPocketBaseFileUrlForBase = (
    baseUrl: string,
    {
        collection,
        recordId,
        filename,
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

    return `${normalizedBaseUrl}/${filePath}`;
};


export const getPocketbaseFileUrl = (input: PocketBaseFileUrlInput) => getPocketBaseFileUrlForBase(
    pocketbaseUrl,
    input,
);
