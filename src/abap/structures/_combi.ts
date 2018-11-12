import {Structure} from "./_structure";
import {StructureNode, StatementNode} from "../nodes/";
import {INode} from "../nodes/_inode";

export interface IMatch {
  matched: StatementNode[];
  unmatched: StatementNode[];
  error: boolean;
  errorDescription: string;
  errorMatched: number;
}

export interface IStructureRunnable {
  toRailroad(): string;
  getUsing(): string[];
  run(statements: StatementNode[], parent: INode): IMatch;
}

class Sequence implements IStructureRunnable {
  private list: Array<IStructureRunnable>;

  constructor(list: IStructureRunnable[]) {
    if (list.length < 2) {
      throw new Error("Sequence, length error");
    }
    this.list = list;
  }

  public toRailroad() {
    const children = this.list.map((e) => { return e.toRailroad(); });
    return "Railroad.Sequence(" + children.join() + ")";
  }

  public getUsing() {
    return this.list.reduce((a, c) => { return a.concat(c.getUsing()); }, []);
  }

  public run(statements: StatementNode[], parent: INode): IMatch {
    let inn = statements;
    let out: StatementNode[] = [];
    for (let i of this.list) {
      let match = i.run(inn, parent);
      if (match.error) {
        return {
          matched: [],
          unmatched: statements,
          error: true,
          errorDescription: match.errorDescription,
          errorMatched: out.length,
        };
      }
      out = out.concat(match.matched);
      inn = match.unmatched;
    }
    return {
      matched: out,
      unmatched: inn,
      error: false,
      errorDescription: "",
      errorMatched: 0,
    };
  }
}

class Alternative implements IStructureRunnable {
  private list: Array<IStructureRunnable>;

  constructor(list: IStructureRunnable[]) {
    if (list.length < 2) {
      throw new Error("Alternative, length error");
    }
    this.list = list;
  }

  public toRailroad() {
    let children = this.list.map((e) => { return e.toRailroad(); });
    return "Railroad.Choice(0, " + children.join() + ")";
  }

  public getUsing() {
    return this.list.reduce((a, c) => { return a.concat(c.getUsing()); }, []);
  }

  public run(statements: StatementNode[], parent: INode): IMatch {
    let count = 0;
    let countError = "";
    for (let i of this.list) {
      const match = i.run(statements, parent);
      if (match.error === false) {
        return match;
      }
      if (match.errorMatched > count) {
        countError = match.errorDescription;
        count = match.errorMatched;
      }
    }
    let children = this.list.map((e) => { return e.constructor.name.toUpperCase(); });
    if (count === 0) {
      return {
        matched: [],
        unmatched: statements,
        error: true,
        errorDescription: "Expected " + children.join(" or "),
        errorMatched: count,
      };
    } else {
      return {
        matched: [],
        unmatched: statements,
        error: true,
        errorDescription: countError,
        errorMatched: count,
      };
    }
  }
}

class Optional implements IStructureRunnable {
  private obj: IStructureRunnable;

  constructor(obj: IStructureRunnable) {
    this.obj = obj;
  }

  public toRailroad() {
    return "Railroad.Optional(" + this.obj.toRailroad() + ")";
  }

  public getUsing() {
    return this.obj.getUsing();
  }

  public run(statements: StatementNode[], parent: INode): IMatch {
    let ret = this.obj.run(statements, parent);
    ret.error = false;
    return ret;
  }
}

class Star implements IStructureRunnable {
  private obj: IStructureRunnable;

  constructor(obj: IStructureRunnable) {
    if (obj === undefined) {
      throw new Error("Star, input undefined");
    }
    this.obj = obj;
  }

  public toRailroad() {
    return "Railroad.ZeroOrMore(" + this.obj.toRailroad() + ")";
  }

  public getUsing() {
    return this.obj.getUsing();
  }

  public run(statements: StatementNode[], parent: INode): IMatch {
    let inn = statements;
    let out: StatementNode[] = [];
    // tslint:disable-next-line:no-constant-condition
    while (true) {
      let match = this.obj.run(inn, parent);
      if (inn.length === 0) {
        return {
          matched: out,
          unmatched: inn,
          error: false,
          errorDescription: "",
          errorMatched: 0,
        };
      } else if (match.error === true) {
        if (match.errorMatched > 0) {
          return {
            matched: out,
            unmatched: inn,
            error: true,
            errorDescription: match.errorDescription,
            errorMatched: match.errorMatched,
          };
        } else {
          return {
            matched: out,
            unmatched: inn,
            error: false,
            errorDescription: "",
            errorMatched: 0,
          };
        }
      }
      out = out.concat(match.matched);
      inn = match.unmatched;
    }
  }
}

class SubStructure implements IStructureRunnable {
  private s: Structure;

  constructor(s: Structure) {
    this.s = s;
  }

  public toRailroad() {
    return "Railroad.NonTerminal('" + this.s.constructor.name + "', {href: '#/structure/" + this.s.constructor.name + "'})";
  }

  public getUsing() {
    return ["structure/" + this.s.constructor.name];
  }

  public run(statements: StatementNode[], parent: INode): IMatch {
    let nparent = new StructureNode(this.s);
    let ret = this.s.getMatcher().run(statements, nparent);
    if (ret.matched.length === 0) {
      ret.error = true;
    } else {
      parent.addChild(nparent);
    }
    return ret;
  }
}

class SubStatement implements IStructureRunnable {
  private obj: any;

  constructor(obj: any) {
    this.obj = obj;
  }

  public toRailroad() {
    return "Railroad.Terminal('" + this.className() + "', {href: '#/statement/" + this.className() + "'})";
  }

  public getUsing() {
    return ["statement/" + this.className()];
  }

  private className() {
    return (this.obj + "").match(/\w+/g)[1];
  }

  public run(statements: StatementNode[], parent: INode): IMatch {
    if (statements.length === 0) {
      return {
        matched: [],
        unmatched: [],
        error: true,
        errorDescription: "Expected " + this.className().toUpperCase(),
        errorMatched: 0,
      };
    } else if (statements[0].get() instanceof this.obj) {
      parent.addChild(statements[0]);
      return {
        matched: [statements[0]],
        unmatched: statements.splice(1),
        error: false,
        errorDescription: "",
        errorMatched: 0,
      };
    } else {
      return {
        matched: [],
        unmatched: statements,
        error: true,
        errorDescription: "Expected " + this.className().toUpperCase(),
        errorMatched: 0,
      };
    }
  }
}

export function seq(first: IStructureRunnable, ...rest: IStructureRunnable[]): IStructureRunnable {
  return new Sequence([first].concat(rest));
}

export function alt(first: IStructureRunnable, ...rest: IStructureRunnable[]): IStructureRunnable {
  return new Alternative([first].concat(rest));
}

export function beginEnd(begin: IStructureRunnable, body: IStructureRunnable, end: IStructureRunnable): IStructureRunnable {
  return new Sequence([begin, body, end]);
}

export function opt(o: IStructureRunnable): IStructureRunnable {
  return new Optional(o);
}

export function star(s: IStructureRunnable): IStructureRunnable {
  return new Star(s);
}

export function sta(s: Object): IStructureRunnable {
  return new SubStatement(s);
}

export function sub(s: Structure): IStructureRunnable {
  return new SubStructure(s);
}