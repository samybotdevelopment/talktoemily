import { createServiceClient } from '@/lib/supabase/server';
import { createEmbedding } from '@/lib/services/openai.service';
import {
  createCollection,
  deleteCollection,
  upsertVectors,
  collectionExists,
} from '@/lib/services/qdrant.service';
import { incrementTrainingUsage } from '@/lib/services/usage.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Train a chatbot by rebuilding its Qdrant collection
 * This follows the spec EXACTLY:
 * 1. Load ALL training items
 * 2. Generate embeddings for each
 * 3. Delete old collection
 * 4. Create new collection
 * 5. Insert all vectors
 * 6. Mark complete
 */
export async function trainChatbot(websiteId: string, orgId: string): Promise<void> {
  const supabase = (await createServiceClient()) as any;

  // Create training run record
  const { data: trainingRun, error: runError } = await supabase
    .from('training_runs')
    .insert({
      website_id: websiteId,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (runError || !trainingRun) {
    throw new Error('Failed to create training run');
  }

  try {
    // Step 1: Load ALL training items for this website
    const { data: trainingItems, error: itemsError } = await supabase
      .from('training_items')
      .select('*')
      .eq('website_id', websiteId);

    if (itemsError) {
      throw new Error('Failed to load training items');
    }

    if (!trainingItems || trainingItems.length === 0) {
      throw new Error('No training items found. Add some content before training.');
    }

    console.log(`Training ${trainingItems.length} items for website ${websiteId}`);

    // Step 2: Generate embeddings for each item
    // IMPORTANT: Embed ONLY the content, not the title
    // The title is generic (e.g., "Contact: Hero Section") and dilutes semantic relevance
    // We store the title in the payload for display purposes only
    const embeddingPromises = trainingItems.map(async (item: any) => {
      const embedding = await createEmbedding(item.content);
      return {
        id: item.id,
        vector: embedding,
        payload: {
          title: item.title,
          content: item.content,
          source: item.source as 'manual' | 'wg',
          created_at: item.created_at,
        },
      };
    });

    const vectors = await Promise.all(embeddingPromises);

    // Step 3 & 4: Delete old collection and create new one
    const collectionAlreadyExists = await collectionExists(websiteId);
    
    if (collectionAlreadyExists) {
      console.log(`Deleting existing collection for website ${websiteId}`);
      await deleteCollection(websiteId);
    }

    console.log(`Creating new collection for website ${websiteId}`);
    await createCollection(websiteId);

    // Step 5: Insert all vectors
    console.log(`Inserting ${vectors.length} vectors`);
    await upsertVectors(websiteId, vectors);

    // Step 6: Mark training as completed
    const { error: updateError } = await supabase
      .from('training_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', trainingRun.id);

    if (updateError) {
      console.error('Failed to update training run status:', updateError);
    }

    // Increment usage tracking
    await incrementTrainingUsage(orgId);

    console.log(`Training completed successfully for website ${websiteId}`);
  } catch (error: any) {
    console.error('Training failed:', error);

    // Mark training as failed, but keep old collection if it exists
    await supabase
      .from('training_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message || 'Unknown error',
      })
      .eq('id', trainingRun.id);

    throw error;
  }
}

/**
 * Get training status for a website
 */
export async function getTrainingStatus(websiteId: string) {
  const supabase = (await createServiceClient()) as any;

  const { data: latestRun } = await supabase
    .from('training_runs')
    .select('*')
    .eq('website_id', websiteId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  return latestRun;
}

/**
 * Check if a website has been trained
 */
export async function isTrained(websiteId: string): Promise<boolean> {
  const status = await getTrainingStatus(websiteId);
  return status?.status === 'completed';
}
