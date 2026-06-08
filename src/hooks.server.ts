import type { Handle } from "@sveltejs/kit";
import PocketBase from "pocketbase";
import { pocketbaseUrl } from "$lib/util/pocketbase";
import { Collections } from "$lib/types/PocketBaseTypes";


export const handle: Handle = async ({ event, resolve }) => {
    event.locals.pb = new PocketBase(pocketbaseUrl);
    event.locals.pb.authStore.loadFromCookie(event.request.headers.get("cookie") ?? "");

    try {
        if (event.locals.pb.authStore.isValid) {
            await event.locals.pb.collection(Collections.Accounts).authRefresh();
        }
    } catch (error) {
        console.error(error);
        event.locals.pb.authStore.clear();
    }

    event.locals.userRecord = event.locals.pb.authStore.record;

    const response = await resolve(event);

    response.headers.append("Set-Cookie", event.locals.pb.authStore.exportToCookie({
        httpOnly: false,
        sameSite: "lax",
        secure: event.url.protocol === "https:",
    }));

    return response;
};
