// src/services/visionAPI.ts

export interface DetectedObject {
    name: string;
    confidence: number;
    boundingBox?: {
        normalizedVertices: Array<{ x: number; y: number }>;
    };
}

export interface VisionAPIResponse {
    objectCounts: { [key: string]: number };
    detectedObjects: DetectedObject[];
    labels: { name: string; confidence: number }[];
}

class VisionAPIService {
    private apiKey: string;
    private baseURL = 'https://vision.googleapis.com/v1/images:annotate';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Convert an image to base64 format
     */
    async imageToBase64(imageDataUrl: string): Promise<string> {
        // Remove data URL prefix to get just the base64 string
        return imageDataUrl.split(',')[1];
    }

    /**
     * Scan an image and detect objects
     */
    async scanImage(imageDataUrl: string): Promise<VisionAPIResponse> {
        try {
            const base64Image = await this.imageToBase64(imageDataUrl);

            const requestPayload = {
                requests: [
                    {
                        image: {
                            content: base64Image
                        },
                        features: [
                            {
                                type: 'OBJECT_LOCALIZATION',
                                maxResults: 50
                            },
                            {
                                type: 'LABEL_DETECTION',
                                maxResults: 20
                            }
                        ]
                    }
                ]
            };

            const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error?.message || `API error: ${response.status}`
                );
            }

            const data = await response.json();
            return this.processResponse(data);
        } catch (error) {
            console.error('Vision API Error:', error);
            throw error;
        }
    }

    /**
     * Process the raw API response into a structured format
     */
    private processResponse(data: any): VisionAPIResponse {
        if (!data.responses || data.responses.length === 0) {
            throw new Error('No response received from Vision API');
        }

        const result = data.responses[0];

        // Count objects
        const objectCounts: { [key: string]: number } = {};
        const detectedObjects: DetectedObject[] = [];

        if (result.localizedObjectAnnotations) {
            result.localizedObjectAnnotations.forEach((obj: any) => {
                objectCounts[obj.name] = (objectCounts[obj.name] || 0) + 1;
                detectedObjects.push({
                    name: obj.name,
                    confidence: obj.score,
                    boundingBox: obj.boundingPoly
                });
            });
        }

        const labels =
            result.labelAnnotations?.map((label: any) => ({
                name: label.description,
                confidence: label.score
            })) || [];

        return {
            objectCounts,
            detectedObjects,
            labels
        };
    }

    /**
     * Filter objects by category (e.g., only fruits)
     */
    filterByCategory(
        response: VisionAPIResponse,
        categories: string[]
    ): VisionAPIResponse {
        const filteredObjects = response.detectedObjects.filter(obj =>
            categories.some(category =>
                obj.name.toLowerCase().includes(category.toLowerCase())
            )
        );

        const filteredCounts: { [key: string]: number } = {};
        filteredObjects.forEach(obj => {
            filteredCounts[obj.name] = (filteredCounts[obj.name] || 0) + 1;
        });

        return {
            objectCounts: filteredCounts,
            detectedObjects: filteredObjects,
            labels: response.labels
        };
    }
}

export default VisionAPIService;