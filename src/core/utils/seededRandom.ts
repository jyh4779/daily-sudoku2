/**
 * A simple seeded random number generator (Mulberry32).
 * Returns a function that generates numbers between 0 and 1.
 */
export const seededRandom = (seed: string) => {
    // Hash the seed string to get a starting number
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    }
    let a = h;

    return () => {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};
