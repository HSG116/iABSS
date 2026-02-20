export const getAssetUrl = (path: string | null | undefined) => {
    if (!path) return null;

    // If it's already a full URL, return it
    if (path.startsWith('http')) return path;

    // Remove leading slash if exists to avoid doubles
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // Get base URL from Vite or fall back to current origin
    // Note: import.meta.env.BASE_URL is usually './' or '/' or '/repo/'
    const baseUrl = import.meta.env.BASE_URL || './';

    // Handle relative base paths
    if (baseUrl === './' || baseUrl === '') {
        return `/${cleanPath}`;
    }

    // Ensure base URL ends with a slash and no leading slash on path
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return `${normalizedBase}${cleanPath}`;
};
