import {Statement} from "./statement";
import {str, IRunnable} from "../combi";

export class Start extends Statement {

  public static get_matcher(): IRunnable {
    return str("START-OF-SELECTION");
  }

  public isStructure() {
    return true;
  }

  public isValidParent(s) {
    return s === undefined;
  }

  public indentationSetStart() {
    return 0;
  }

  public indentationSetEnd() {
    return 2;
  }

}