import { Chess, Game } from "../game.schema";
import { ChessObject } from "./chess";
import { Aatrox } from "./aatrox";
import { Ahri } from "./ahri";
import { Janna } from "./janna";
import { Garen } from "./garen";
import { Ashe } from "./ashe";
import { Blitzcrank } from "./blitzcrank";
import { KhaZix } from "./khazix";
import { Zed } from "./zed";
import { Malphite } from "./malphite";
import { Sion } from "./sion";
import { Jhin } from "./jhin";
import { Soraka } from "./soraka";
import { Nasus } from "./nasus";
import { Teemo } from "./teemo";
import { Rammus } from "./rammus";
import { Yasuo } from "./yasuo";
import { Tryndamere } from "./tryndamere";
import { Viktor } from "./viktor";
import { TwistedFate } from "./twistedfate";
import { Tristana } from "./tristana";

export class ChessFactory {
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
      default:
        return new ChessObject(chess, game);
    }
  }
}
