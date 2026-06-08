import { describe, expect, test, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import CharacterCard from "./CharacterCard.svelte";
import { Character } from "$lib/types/Character.svelte";
import type { IdentitySummary } from "$lib/types/Identity";
import { store } from "$lib/types/Store.svelte";


const identityForAccount = (accountId: string): IdentitySummary => ({
    id: `identity-${accountId}`,
    identityId: `identity-${accountId}`,
    accountId,
    name: accountId,
    avatarUrl: null,
});

const makeCharacter = (name: string, accountId: string) => new Character({
    name,
    ownerIdentities: [identityForAccount(accountId)],
    uploaded: true,
});

const signInAs = (accountId: string) => {
    store.databaseStore.userRecord = {id: accountId} as typeof store.databaseStore.userRecord;
};


describe("CharacterCard", () => {
    beforeEach(() => {
        store.characterManager.characters = [];
        store.characterManager.selectedCharacter = null;
        store.characterManager.editingCharacter = null;
        store.databaseStore.userRecord = null;
    });

    test("selecting a character does not enter edit mode", async () => {
        const character = makeCharacter("Scale Wing", "account-1");
        signInAs("account-1");

        render(CharacterCard, {props: {character}});

        await fireEvent.click(screen.getByRole("button", {name: /^Scale Wing\b/}));

        expect(store.characterManager.selectedCharacter).toBe(character);
        expect(store.characterManager.editingCharacter).toBeNull();
    });

    test("the selected owner edit control enters edit mode", async () => {
        const character = makeCharacter("Scale Wing", "account-1");
        signInAs("account-1");

        const {container} = render(CharacterCard, {props: {character}});

        await fireEvent.click(screen.getByRole("button", {name: /^Scale Wing\b/}));

        expect(container.querySelector(".edit-overlay")).not.toBeNull();
        expect(container.querySelector(".selected-character-controls")).toBeNull();

        await fireEvent.click(screen.getByRole("button", {name: "Edit Scale Wing"}));

        expect(store.characterManager.selectedCharacter).toBe(character);
        expect(store.characterManager.editingCharacter).toBe(character);
    });

    test("the unselected owner edit control selects and edits the character", async () => {
        const selectedCharacter = makeCharacter("Already Selected", "account-1");
        const character = makeCharacter("Scale Wing", "account-1");
        signInAs("account-1");
        store.characterManager.selectedCharacter = selectedCharacter;

        render(CharacterCard, {props: {character}});

        await fireEvent.click(screen.getByRole("button", {name: "Edit Scale Wing"}));

        expect(store.characterManager.selectedCharacter).toBe(character);
        expect(store.characterManager.editingCharacter).toBe(character);
    });

    test("a non-owner card can be selected but does not expose edit mode", async () => {
        const character = makeCharacter("Scale Wing", "account-2");
        signInAs("account-1");

        render(CharacterCard, {props: {character}});

        expect(screen.queryByRole("button", {name: "Edit Scale Wing"})).toBeNull();

        await fireEvent.click(screen.getByRole("button", {name: /^Scale Wing\b/}));

        expect(store.characterManager.selectedCharacter).toBe(character);
        expect(store.characterManager.editingCharacter).toBeNull();
    });

    test("other character cards are muted during edit mode", () => {
        const character = makeCharacter("Scale Wing", "account-1");
        const editingCharacter = makeCharacter("Editing", "account-1");
        store.characterManager.editingCharacter = editingCharacter;

        const {container} = render(CharacterCard, {props: {character}});

        expect(container.querySelector(".character-card")).toHaveClass("edit-muted");
    });
});
