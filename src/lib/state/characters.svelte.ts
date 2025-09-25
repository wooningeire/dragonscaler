import { Character } from "../types/Character.svelte";

let characters = $state<Character[]>([]);

export const currentCharacters = () => characters;

export const addCharacter = (character: Character) => {
    characters.push(character);
};