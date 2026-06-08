// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type PocketBase from "pocketbase";
import type { AuthRecord } from "pocketbase";


declare global {
    namespace App {
        interface Locals {
            pb: PocketBase,
            userRecord: AuthRecord,
        }

        interface PageData {
            userRecord: AuthRecord,
        }

        // interface Error {}
        // interface PageState {}
        // interface Platform {}
    }
}

export {};
