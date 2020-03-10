export function isNil(elem: any): boolean {
  return elem === undefined || elem === null;
}

export function unique<E>(arr: E[]) {
  return arr.filter((elem, ix) => arr.indexOf(elem) === ix);
}
