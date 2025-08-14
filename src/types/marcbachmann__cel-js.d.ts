// https://github.com/marcbachmann/cel-js の記述を元に構成
declare module "@marcbachmann/cel-js" {
  export function evaluate<T = unknown>(
    expression: string,
    context?: object,
    functions?: object,
  ): T;
  export function parse<T = unknown>(
    expression: string,
  ): (context?: object, functions?: object) => T;
}
