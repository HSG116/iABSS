
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';

export const pexelsService = {
    async fetchRandomImage(query: string): Promise<string | null> {
        try {
            const usedImages = JSON.parse(localStorage.getItem('pexels_used_images') || '[]');

            // Fetch multiple images and find one not used
            const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&page=${Math.floor(Math.random() * 5) + 1}`, {
                headers: {
                    Authorization: PEXELS_API_KEY
                }
            });

            if (!response.ok) return null;

            const data = await response.json();
            const photos = data.photos;

            if (!photos || photos.length === 0) return null;

            // Find a photo that hasn't been used yet
            let selectedPhoto = photos.find((p: any) => !usedImages.includes(p.id));

            // If all are used, just take the first one and reset cache partially
            if (!selectedPhoto) {
                selectedPhoto = photos[0];
            } else {
                // Save to used images
                usedImages.push(selectedPhoto.id);
                // Keep only last 500
                if (usedImages.length > 500) usedImages.shift();
                localStorage.setItem('pexels_used_images', JSON.stringify(usedImages));
            }

            return selectedPhoto.src.large2x || selectedPhoto.src.large || selectedPhoto.src.original;
        } catch (error) {
            console.error('Error fetching Pexels image:', error);
            // Fallback to Pollinations AI (free, no key needed)
            return `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?width=1080&height=1080&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
        }
    }
};
