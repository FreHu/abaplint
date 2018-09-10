import {Statement} from "./statement";
import * as Reuse from "./reuse";
import {str, seq, alt, opt, per, plus, IRunnable} from "../combi";

export class ModifyLine extends Statement {

  public static get_matcher(): IRunnable {

    let form = seq(alt(str("INVERSE"), str("INPUT")),
                   str("="),
                   new Reuse.Source());

    let value = seq(str("FIELD VALUE"), plus(new Reuse.Source()));
    let format = seq(str("FIELD FORMAT"), new Reuse.Source(), opt(form));
    let from = seq(str("FROM"), new Reuse.Source());
    let lineValue = seq(str("LINE VALUE FROM"), new Reuse.Source());
    let index = seq(str("INDEX"), new Reuse.Source());
    let page = seq(str("OF PAGE"), new Reuse.Source());
    let ocp = str("OF CURRENT PAGE");
    let lineFormat = str("LINE FORMAT INPUT OFF");
    let intensified = str("INTENSIFIED ON");

    let options = per(index, value, from, format, page, lineFormat, lineValue, ocp, intensified);

    let ret = seq(str("MODIFY"),
                  alt(str("CURRENT LINE"),
                      seq(str("LINE"), new Reuse.Source())),
                  opt(options));

    return ret;
  }

}