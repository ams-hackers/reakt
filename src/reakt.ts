import { isNil, unique } from "./utils";

type ShadowPrimitiveElement = {
  kind: "primitive";
  type: string;
  props: { [key: string]: unknown };
  children: Array<ShadowNode>;
};

type ShadowUserElement = {
  kind: "user";
  type: Component<unknown>;
  props: { [key: string]: unknown };
  output?: ShadowNode; // result of calling componentFunction(props)
  stateSlot?: unknown; // preserve the value of this across versions of the shadow node tree
};

type ShadowElement = ShadowPrimitiveElement | ShadowUserElement;

let currentElement: ShadowUserElement | null = null;
function getComponentOutput(node: ShadowUserElement): ShadowNode {
  if (node.output) {
    return node.output;
  } else {
    currentElement = node;
    const output = node.type(node.props);
    currentElement = null;
    node.output = output;
    return output;
  }
}

export type ShadowNode =
  | ShadowPrimitiveElement
  | ShadowElement
  | string
  | undefined
  | null;

type Component<P> = (props: P) => ShadowNode;

export function isShadowElement(elem: ShadowNode): elem is ShadowElement {
  return typeof (elem as any).kind === "string";
}

export function isPrimitiveShadowElement(
  elem: ShadowNode
): elem is ShadowPrimitiveElement {
  return isShadowElement(elem) && elem.kind === "primitive";
}

export function isUserShadowElement(
  elem: ShadowNode
): elem is ShadowUserElement {
  return isShadowElement(elem) && elem.kind === "user";
}

export function createElement<P>(
  type: string | Component<P>,
  props: P,
  ...children: ShadowElement[]
): ShadowNode {
  if (typeof type !== "string") {
    return {
      kind: "user",
      type: type as Component<unknown>,
      props: { ...props, children }
    };
  } else {
    return {
      kind: "primitive",
      type,
      props: props || {},
      children
    };
  }
}

export function useRenderCounter() {
  if (typeof currentElement!.stateSlot === "undefined") {
    // newly mounted component
    currentElement!.stateSlot = 0;
  }
  (currentElement!.stateSlot as number)++;
  return currentElement!.stateSlot;
}

export type Patch =
  | { action: "noop" }
  | { action: "insert"; element: ShadowNode }
  | {
      action: "update";
      props: Array<{ key: string; value: unknown }>;
      children: Patch[];
    }
  | { action: "update-text"; value: string }
  | { action: "delete" }
  | { action: "replace"; element: ShadowNode };

export function reconcile(
  prev: ShadowNode,
  next: ShadowNode
): Patch | undefined {
  if (prev === next) {
    // This case is an optimization. We know ShadowNode are immutable
    // so if they objects are identical, we don't need to check
    // children at all. This is useful if a component is memoized.
    return { action: "noop" };
  } else if (isNil(prev) && isNil(next)) {
    return undefined;
  } else if (isNil(prev)) {
    return { action: "insert", element: next };
  } else if (isNil(next)) {
    return { action: "delete" };
  } else if (
    (typeof prev === "string" && typeof next === "string") ||
    (typeof prev === "number" && typeof next === "number")
  ) {
    return prev === next
      ? { action: "noop" }
      : { action: "update-text", value: next };
  } else if (
    isPrimitiveShadowElement(prev) &&
    isPrimitiveShadowElement(next) &&
    prev.type === next.type
  ) {
    const updatedKeys = unique([
      ...Object.keys(prev.props),
      ...Object.keys(next.props)
    ])
      .filter(k => prev.props[k] !== next.props[k])
      .filter(k => k !== "children");
    const props = updatedKeys.map(key => ({ key, value: next.props[key] }));

    let children: Patch[] = [];
    for (
      let i = 0;
      i < Math.max(prev.children.length, next.children.length);
      i++
    ) {
      // We want to make sure that each children here matches one DOM
      // element (except the final inserts).
      //
      // `undefined` shadow nodes are not rendered. So if a node is
      // undefined before and after, there is no DOM elemnet for
      // it. So we will skip it.
      //
      if (isNil(prev.children[i]) && isNil(next.children[i])) {
        continue;
      }
      const diff = reconcile(prev.children[i], next.children[i]);
      if (diff) {
        children.push(diff);
      }
    }

    if (props.length === 0 && children.every(p => p.action === "noop")) {
      return { action: "noop" };
    } else {
      return { action: "update", props, children };
    }
  } else if (
    isUserShadowElement(prev) &&
    isUserShadowElement(next) &&
    prev.type == next.type
  ) {
    next.stateSlot = prev.stateSlot;
    return reconcile(getComponentOutput(prev), getComponentOutput(next));
  } else {
    return { action: "replace", element: next };
  }
}

function shadowNodeToHTML(elem: ShadowNode): Node {
  let element: HTMLElement | Text;
  if (!isShadowElement(elem)) {
    element = document.createTextNode(elem as string);
  } else if (elem.kind === "user") {
    return shadowNodeToHTML(getComponentOutput(elem));
  } else {
    element = document.createElement(elem.type);
    for (let propName in elem.props) {
      (element as any)[propName] = elem.props[propName];
    }
    for (let child of elem.children) {
      if (isNil(child)) continue;
      let childElem = shadowNodeToHTML(child);
      element.appendChild(childElem);
    }
  }
  return element;
}

function insertShadowNodeBefore(elem: ShadowNode, parent: Node, target?: Node) {
  parent.insertBefore(shadowNodeToHTML(elem), target || null);
}

function exhaustiveCheck(_: never) {}

function applyPatchInto(patch: Patch, parent: Node, target?: Node): void {
  switch (patch.action) {
    case "noop":
      return;
    case "insert":
      insertShadowNodeBefore(patch.element, parent, target);
      return;
    case "delete":
      parent.removeChild(target!);
      return;
    case "update-text":
      target!.textContent = patch.value;
      return;
    case "update":
      patch.props.forEach(p => {
        (target as any)[p.key] = p.value;
      });
      let removedChildNodes = 0;
      for (let i = 0; i < patch.children.length; i++) {
        const diff = patch.children[i];
        applyPatchInto(
          diff,
          target!,
          target!.childNodes[i - removedChildNodes]
        );
        if (diff.action === "delete") {
          removedChildNodes++;
        }
      }
      return;
    case "replace":
      parent.replaceChild(shadowNodeToHTML(patch.element), target!);
      return;
  }

  exhaustiveCheck(patch);
}

let prevShadow: ShadowNode;
export function render(elem: ShadowNode, root: Node) {
  const diff = reconcile(prevShadow, elem);
  prevShadow = elem;
  if (diff) {
    applyPatchInto(diff, root, root.childNodes[0]);
  }
}
