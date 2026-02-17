import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantPayload } from '@/types/models';

/**
 * Qdrant Vector Database Client
 * Manages vector storage and similarity search for chatbot training data
 * Note: QDRANT_URL must use HTTPS in production environments
 */
const client = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false,
  timeout: 30000, // 30 seconds
});

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: QdrantPayload;
}

/**
 * Get collection name for a website
 */
export function getCollectionName(websiteId: string): string {
  return `website_${websiteId}`;
}

/**
 * Check if a collection exists
 */
export async function collectionExists(websiteId: string): Promise<boolean> {
  try {
    const collectionName = getCollectionName(websiteId);
    const response = await client.getCollection(collectionName);
    return !!response;
  } catch (error) {
    return false;
  }
}

/**
 * Create a new collection for a website
 */
export async function createCollection(websiteId: string): Promise<void> {
  const collectionName = getCollectionName(websiteId);
  
  // OpenAI embeddings are pre-normalized, so Dot product = Cosine
  // Using Dot product can sometimes give better scores
  await client.createCollection(collectionName, {
    vectors: {
      size: 1536, // OpenAI text-embedding-3-small dimension
      distance: 'Dot',
    },
  });
}

/**
 * Delete a collection
 */
export async function deleteCollection(websiteId: string): Promise<void> {
  const collectionName = getCollectionName(websiteId);
  
  try {
    await client.deleteCollection(collectionName);
  } catch (error) {
    console.error(`Failed to delete collection ${collectionName}:`, error);
    // Don't throw - collection might not exist
  }
}

/**
 * Insert vectors into a collection
 */
export async function upsertVectors(
  websiteId: string,
  points: VectorPoint[]
): Promise<void> {
  const collectionName = getCollectionName(websiteId);
  
  if (!points || points.length === 0) {
    throw new Error('No points to upsert');
  }
  
  await client.upsert(collectionName, {
    wait: true,
    points: points.map(point => ({
      id: point.id,
      vector: point.vector,
      payload: point.payload as unknown as Record<string, unknown>,
    })),
  });
}

/**
 * Search for similar vectors
 */
export async function searchSimilar(
  websiteId: string,
  queryVector: number[],
  limit: number = 5
): Promise<Array<{ score: number; payload: QdrantPayload }>> {
  const collectionName = getCollectionName(websiteId);
  
  try {
    console.log(`[Qdrant] Searching collection: ${collectionName}, URL: ${process.env.QDRANT_URL}`);
    
    const results = await client.search(collectionName, {
      vector: queryVector,
      limit,
      with_payload: true,
    });

    console.log(`[Qdrant] Search successful, found ${results.length} results`);

    return results.map(result => ({
      score: result.score,
      payload: result.payload as unknown as QdrantPayload,
    }));
  } catch (error: any) {
    console.error(`[Qdrant] Search failed for collection ${collectionName}:`, {
      error: error.message,
      code: error.code,
      status: error.status,
      cause: error.cause?.message || error.cause,
    });
    
    // Check if it's a "collection not found" error
    if (error?.status === 404 || error?.message?.includes('Not found') || error?.message?.includes('not found')) {
      throw new Error('Bot not trained yet. Please train the bot first from the dashboard.');
    }
    
    // Check if it's a connection error
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT' || error?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      throw new Error('Cannot connect to vector database. Please contact support.');
    }
    
    throw new Error(`Failed to search vectors: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get collection info
 */
export async function getCollectionInfo(websiteId: string) {
  const collectionName = getCollectionName(websiteId);
  
  try {
    return await client.getCollection(collectionName);
  } catch (error) {
    return null;
  }
}

/**
 * Test Qdrant connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await client.getCollections();
    return true;
  } catch (error) {
    console.error('Qdrant connection failed:', error);
    return false;
  }
}
