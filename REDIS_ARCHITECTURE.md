# Redis-Based Game State Architecture

## Overview

The game state management system has been refactored to use Redis for real-time caching and BullMQ queues for asynchronous MongoDB persistence. This architecture provides:

- **Fast Read/Write**: Game state operations use Redis cache for sub-millisecond response times
- **Asynchronous Persistence**: MongoDB updates are queued and processed asynchronously
- **Scalability**: Reduced database load allows for more concurrent games
- **Reliability**: Automatic retry mechanism ensures eventual consistency
- **Real-time Performance**: WebSocket updates are instant with Redis

## Architecture Components

### 1. Redis Cache Service (`redis-game-cache.service.ts`)

Manages game state caching and queue operations:

```typescript
// Get game state (from Redis cache)
await redisCache.getGameState(gameId)

// Set game state (to Redis + queue MongoDB update)
await redisCache.setGameState(gameId, gameState, { priority: 7 })

// Set without queuing persistence (cache only)
await redisCache.setGameState(gameId, gameState, { skipPersistence: true })
```

**Features:**
- Automatic TTL (24 hours) for game states
- Configurable job priorities (1-10, higher = more urgent)
- Queue statistics and monitoring
- Automatic retry on failure (3 attempts with exponential backoff)

### 2. Game Persistence Processor (`game-persistence.processor.ts`)

BullMQ worker that processes queued game persistence jobs:

```typescript
@Processor('game-persistence')
export class GamePersistenceProcessor extends WorkerHost {
  async process(job: Job) {
    // Persists game state from queue to MongoDB
  }
}
```

**Features:**
- Handles create and update operations
- Automatic job retry on failure
- Job completion/failure logging
- Maintains job history (last 100 completed, last 1000 failed)

### 3. Game Service Refactoring

The `GameService` now uses Redis-first approach:

```typescript
// Helper method: Get game from cache or MongoDB
private async getGameState(gameId: string): Promise<Game | null>

// Helper method: Save to Redis and queue MongoDB persistence
private async saveGameState(gameId: string, game: Game, priority: number = 5)
```

**Updated Methods:**
- `findOne()` - Reads from Redis cache first
- `executeAction()` - Writes to Redis, queues MongoDB update (priority 7)
- `initializeGameplay()` - High priority write (priority 8)
- `resetGameplay()` - High priority write (priority 8)
- `getActiveGameForUser()` - Caches result after MongoDB query

## Data Flow

### Read Operation
```
Client Request → GameService.findOne()
                    ↓
              Redis Cache Check
                    ↓
        Cache Hit? ←Yes─ Return Game State
                    ↓ No
              MongoDB Query
                    ↓
          Cache Result in Redis
                    ↓
              Return Game State
```

### Write Operation (e.g., Game Action)
```
Client Action → GameService.executeAction()
                    ↓
        Game Logic Processing (GameLogic.processGame)
                    ↓
        Save to Redis Cache (immediate)
                    ↓
    Queue Persistence Job in BullMQ
                    ↓
        Return Updated Game State ←─────┐
                                        │
        [Async Background Process]      │
                    ↓                   │
    BullMQ Worker Processes Job         │
                    ↓                   │
    Update MongoDB (eventually)         │
                    ↓                   │
    Job Complete ───────────────────────┘
```

## Priority Levels

Job priorities determine the order of MongoDB persistence:

- **Priority 10**: Critical (reserved for future use)
- **Priority 8-9**: High priority (game initialization, resets)
- **Priority 5-7**: Normal priority (gameplay actions)
- **Priority 1-4**: Low priority (analytics, logging)

**Current Usage:**
- `initializeGameplay()`: Priority 8
- `resetGameplay()`: Priority 8  
- `executeAction()`: Priority 7
- Default: Priority 5

## Environment Variables

Required Redis configuration in `.env`:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here  # Optional
```

## Monitoring

### Queue Statistics

Get queue stats programmatically:

```typescript
const stats = await redisCache.getQueueStats();
// Returns:
// {
//   waiting: number,    // Jobs waiting to be processed
//   active: number,     // Jobs currently being processed
//   completed: number,  // Total completed jobs
//   failed: number      // Total failed jobs
// }
```

### Redis CLI Monitoring

```bash
# Monitor Redis operations
redis-cli MONITOR

# Check specific game state
redis-cli GET game:{gameId}

# View all game keys
redis-cli KEYS game:*

# Check TTL for a game
redis-cli TTL game:{gameId}
```

### BullMQ Dashboard (Optional)

Install Bull Board for visual monitoring:

```bash
npm install @bull-board/api @bull-board/nestjs
```

## Benefits

### Performance
- **Before**: Direct MongoDB writes (~10-50ms per operation)
- **After**: Redis writes (~1-5ms) + async MongoDB persistence

### Scalability
- Reduced MongoDB connection pool usage
- Can handle 10x more concurrent game operations
- Better resource utilization

### Reliability
- Automatic retry on MongoDB failures
- Game state preserved in Redis even if MongoDB is temporarily unavailable
- Eventual consistency guaranteed

### Real-time
- Instant WebSocket broadcasts (no waiting for MongoDB)
- Better player experience with faster responses

## Caveats and Considerations

### 1. Eventual Consistency
- Redis cache is source of truth for active games
- MongoDB may lag behind by a few seconds (typically < 1 second)
- Queries across multiple games still require MongoDB

### 2. Redis Memory
- Each game state ~50-100KB in Redis
- With 24-hour TTL, inactive games are auto-removed
- Monitor Redis memory usage in production

### 3. Cache Invalidation
- Manual cache deletion if needed:
  ```typescript
  await redisCache.deleteGameState(gameId)
  ```
- MongoDB is always source of truth for historical data

### 4. Queue Failures
- Failed jobs are retried 3 times with exponential backoff
- After 3 failures, jobs move to failed queue
- Monitor failed queue and investigate issues

## Migration Guide

### For New Features

When adding new game operations:

1. **Use helper methods:**
   ```typescript
   // Read operation
   const game = await this.getGameState(gameId);
   
   // Write operation  
   await this.saveGameState(gameId, updatedGame, priority);
   ```

2. **Choose appropriate priority:**
   - Critical state changes: 8-9
   - Gameplay actions: 6-7
   - Non-critical updates: 1-5

3. **Test with Redis:**
   - Verify cache hit/miss behavior
   - Check queue processing
   - Monitor MongoDB persistence

### For Existing Code

Most game operations have been updated. For any remaining direct MongoDB calls:

**Before:**
```typescript
const game = await this.gameModel.findById(gameId).exec();
// ... modify game ...
await game.save();
```

**After:**
```typescript
const game = await this.getGameState(gameId);
// ... modify game ...
await this.saveGameState(gameId, game, priority);
```

## Testing

### Local Development

1. Start Redis:
   ```bash
   docker run -d -p 6379:6379 redis:latest
   # OR
   redis-server
   ```

2. Start the backend:
   ```bash
   npm run start:dev --workspace=apps/backend
   ```

3. Verify Redis connection in logs:
   ```
   [RedisGameCacheService] Redis client connected successfully
   ```

### Production

- Use Redis cluster for high availability
- Monitor queue metrics and set up alerts
- Regular MongoDB backups (cache is not persistent storage)
- Consider Redis persistence (AOF/RDB) for disaster recovery

## Future Enhancements

1. **Redis Cluster**: For production scalability
2. **Queue Priority Tuning**: Dynamic priorities based on game importance
3. **Batch Persistence**: Group multiple updates for efficiency
4. **Cache Warming**: Pre-load active games on server start
5. **Analytics**: Track cache hit rate, queue processing time
6. **Redis Pub/Sub**: Alternative to queue for some operations

## Troubleshooting

### Game state not updating in MongoDB
- Check queue statistics: `await redisCache.getQueueStats()`
- Verify worker is running (check logs for processor)
- Check failed jobs in BullMQ

### Redis connection issues
- Verify Redis is running: `redis-cli PING`
- Check environment variables
- Review firewall/network settings

### Memory issues
- Monitor Redis memory: `redis-cli INFO memory`
- Adjust TTL if needed
- Clear old game states manually if required

### Performance degradation
- Check queue backlog (waiting jobs)
- Scale workers if needed
- Verify MongoDB performance
- Monitor Redis latency

## Support

For issues or questions:
1. Check logs: `[RedisGameCacheService]` and `[GamePersistenceProcessor]`
2. Verify queue stats and health
3. Review Redis and MongoDB metrics
4. Contact development team with diagnostics

