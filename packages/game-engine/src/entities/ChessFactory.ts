import { Chess, Game } from "../types";
import { ChessObject } from "./ChessObject";
import { Aatrox } from "./champions/Aatrox";
import { Ahri } from "./champions/Ahri";
import { Janna } from "./champions/Janna";
import { Garen } from "./champions/Garen";
import { Ashe } from "./champions/Ashe";
import { Azir } from "./champions/Azir";
import { Blitzcrank } from "./champions/Blitzcrank";
import { KhaZix } from "./champions/KhaZix";
import { Zed } from "./champions/Zed";
import { Malphite } from "./champions/Malphite";
import { Sion } from "./champions/Sion";
import { Jhin } from "./champions/Jhin";
import { Soraka } from "./champions/Soraka";
import { Nasus } from "./champions/Nasus";
import { Teemo } from "./champions/Teemo";
import { Rammus } from "./champions/Rammus";
import { Yasuo } from "./champions/Yasuo";
import { Tryndamere } from "./champions/Tryndamere";
import { Viktor } from "./champions/Viktor";
import { TwistedFate } from "./champions/TwistedFate";
import { Tristana } from "./champions/Tristana";
import { Ezreal } from "./champions/Ezreal";
import { Poro } from "./champions/Poro";
import { MeleeMinion } from "./champions/MeleeMinion";
import { CasterMinion } from "./champions/CasterMinion";
import { SandSoldier } from "./champions/SandSoldier";
import { DrMundo } from "./champions/DrMundo";

export interface IChessFactory {
  createChess(chess: Chess, game: Game): ChessObject;
}

export class ChessFactory implements IChessFactory {
  public static createChess(chess: Chess, game: Game): ChessObject {
    switch (chess.name) {
      case "Aatrox":
        return new Aatrox(chess, game);
      case "Ahri":
        return new Ahri(chess, game);
      case "Janna":
        return new Janna(chess, game);
      case "Garen":
        return new Garen(chess, game);
      case "Ashe":
        return new Ashe(chess, game);
      case "Azir":
        return new Azir(chess, game);
      case "Blitzcrank":
        return new Blitzcrank(chess, game);
      case "Kha'Zix":
        return new KhaZix(chess, game);
      case "Zed":
        return new Zed(chess, game);
      case "Malphite":
        return new Malphite(chess, game);
      case "Sion":
        return new Sion(chess, game);
      case "Jhin":
        return new Jhin(chess, game);
      case "Soraka":
        return new Soraka(chess, game);
      case "Nasus":
        return new Nasus(chess, game);
      case "Teemo":
        return new Teemo(chess, game);
      case "Rammus":
        return new Rammus(chess, game);
      case "Yasuo":
        return new Yasuo(chess, game);
      case "Tryndamere":
        return new Tryndamere(chess, game);
      case "Viktor":
        return new Viktor(chess, game);
      case "Twisted Fate":
        return new TwistedFate(chess, game);
      case "Tristana":
        return new Tristana(chess, game);
      case "Ezreal":
        return new Ezreal(chess, game);
      case "Poro":
        return new Poro(chess, game);
      case "Melee Minion":
        return new MeleeMinion(chess, game);
      case "Caster Minion":
        return new CasterMinion(chess, game);
      case "Sand Soldier":
        return new SandSoldier(chess, game);
      case "Dr.Mundo":
        return new DrMundo(chess, game);
      default:
        return new ChessObject(chess, game);
    }
  }

  // Instance method for interface compliance
  createChess(chess: Chess, game: Game): ChessObject {
    return ChessFactory.createChess(chess, game);
  }
}

// Singleton instance for convenience
export const chessFactory = new ChessFactory();
