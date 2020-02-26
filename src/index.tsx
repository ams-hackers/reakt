type ShadowElement = {
  type: string;
  props: { [key: string]: unknown };
  children: Array<ShadowNode>;
};

type ShadowNode = ShadowElement | string | undefined | null;

type Component<P> = (props: P) => ShadowNode;

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

function isNil(elem: ShadowNode): boolean {
  return elem === undefined || elem === null;
}

function isShadowElement(elem: ShadowNode): elem is ShadowElement {
  return typeof (elem as any).type === "string";
}

function unique<E>(arr: E[]) {
  return arr.filter((elem, ix) => arr.indexOf(elem) === ix);
}

function createElement<P>(
  type: string | Component<P>,
  props: P,
  ...children: ShadowElement[]
) {
  if (typeof type !== "string") {
    return type(Object.assign({}, props, { children }));
  }

  return {
    type,
    props: props || {},
    children
  };
}

let update = (ev: any) => {
  console.log(ev.target && ev.target.value);
};
function Test({ name, color }: { name: string; color?: string }) {
  return (
    <div style={`color: ${color}`}>
      <p>
        Hello <strong>{name}</strong>
        <input type="text" onkeydown={update} />
      </p>
    </div>
  );
}

function App({ tick }: { tick: number }) {
  return (
    <div>
      <p>{tick}</p>
      {tick % 2 === 0 ? <p>odd!</p> : null}
      <Test name="hackers" color={tick % 2 === 0 ? "blue" : "green"} />
      <Test name="ams" color="red" />
    </div>
  );
}

type Patch =
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

function getDiff(prev: ShadowNode, next: ShadowNode): Patch {
  if (prev === next) {
    // This case is an optimization. We know ShadowNode are immutable
    // so if they objects are identical, we don't need to check
    // children at all. This is useful if a component is memoized.
    return { action: "noop" };
  } else if (isNil(prev) && isNil(next)) {
    return { action: "noop" };
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
    isShadowElement(prev) &&
    isShadowElement(next) &&
    prev.type === next.type
  ) {
    const updatedKeys = unique([
      ...Object.keys(prev.props),
      ...Object.keys(next.props)
    ]).filter(k => prev.props[k] !== next.props[k]);
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
      children.push(getDiff(prev.children[i], next.children[i]));
    }

    if (props.length === 0 && children.every(p => p.action === "noop")) {
      return { action: "noop" };
    } else {
      return { action: "update", props, children };
    }
  } else {
    return { action: "replace", element: next };
  }
}

function shadowNodeToHTML(elem: ShadowNode): Node {
  let element: HTMLElement | Text;
  if (isShadowElement(elem)) {
    element = document.createElement(elem.type);
    for (let propName in elem.props) {
      (element as any)[propName] = elem.props[propName];
    }
    for (let child of elem.children) {
      if (isNil(child)) continue;
      let childElem = shadowNodeToHTML(child);
      element.appendChild(childElem);
    }
  } else {
    element = document.createTextNode(elem as string);
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
      let delta = 0;
      for (let i = 0; i < patch.children.length; i++) {
        const diff = patch.children[i];
        applyPatchInto(diff, target!, target!.childNodes[i + delta]);
        switch (diff.action) {
          case "insert":
            delta++;
            break;
          case "delete":
            delta--;
            break;
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
function render(elem: ShadowNode, root: Node) {
  const diff = getDiff(prevShadow, elem);
  prevShadow = elem;
  applyPatchInto(diff, root, root.childNodes[0]);
}

setInterval(() => {
  let component = <App tick={Math.floor(Date.now() / 1000)} />;
  const root = document.querySelector("#app")!;
  render(component, root);
}, 1000);
