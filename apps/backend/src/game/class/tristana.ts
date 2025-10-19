import { ChessObject } from "./chess";

export class Tristana extends ChessObject {
  get range(): number {
    if (!this.isPassiveDisabled()) {
      return 8;
    }
    return super.range;
  }
}
