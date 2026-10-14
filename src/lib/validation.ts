/**
 * Nick Minecraft: 3–16 znaków [A-Za-z0-9_]. Opcjonalna kropka na początku dla graczy Bedrock (Geyser/Floodgate).
 * Restrykcyjny wzorzec jest kluczowy – nick trafia do komend wykonywanych przez konsolę serwera.
 */
export const NICK_PATTERN = /^\.?[A-Za-z0-9_]{3,16}$/;

export const isValidNick = (nick: string) => NICK_PATTERN.test(nick);

export const isValidEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
