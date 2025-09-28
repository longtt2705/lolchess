import { Injectable } from '@nestjs/common';

export interface QueuePlayer {
  id: string;
  userId: string;
  username: string;
  socketId: string;
  queuedAt: Date;
}

@Injectable()
export class QueueService {
  private queue: QueuePlayer[] = [];

  addToQueue(player: QueuePlayer): { position: number; playersInQueue: number } {
    // Remove player if already in queue
    this.removeFromQueue(player.userId);
    
    // Add player to queue
    this.queue.push(player);
    
    return {
      position: this.queue.length,
      playersInQueue: this.queue.length,
    };
  }

  removeFromQueue(userId: string): boolean {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(player => player.userId !== userId);
    return this.queue.length < initialLength;
  }

  getQueuePosition(userId: string): number {
    const index = this.queue.findIndex(player => player.userId === userId);
    return index !== -1 ? index + 1 : -1;
  }

  getQueueSize(): number {
    return this.queue.length;
  }


  // Get players in queue for debugging/admin purposes
  getQueueStatus(): QueuePlayer[] {
    return [...this.queue];
  }

  // Clear expired queue entries (players who have been waiting too long)
  clearExpiredEntries(maxWaitTimeMs: number = 300000): void { // 5 minutes default
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - maxWaitTimeMs);
    
    this.queue = this.queue.filter(player => player.queuedAt > cutoffTime);
  }
}
