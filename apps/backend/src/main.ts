import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IoAdapter } from "@nestjs/platform-socket.io";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Enable CORS for frontend (including WebSocket)
  app.enableCors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  const configService = app.get(ConfigService);
  const port = configService.get("PORT", 3001);

  await app.listen(port);
  console.log(`🚀 LOL Chess Backend is running on: http://localhost:${port}`);
  console.log(`🔌 WebSocket server is running on: ws://localhost:${port}`);
}
bootstrap();
