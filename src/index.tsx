type ShadowElement = {
  type: string;
  props: { [key: string]: any };
  children: Array<ShadowNode>;
};

type ShadowNode = ShadowElement | string | undefined;

type Component<P> = (props: P) => ShadowNode;

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

function isShadowElement(elem: ShadowNode): elem is ShadowElement {
  return typeof (elem as any).type === "string";
}

function unique<E>(arr: E[]) {
  return arr.filter((elem, ix) => arr.indexOf(elem) === ix);
}

function createElement<P>(
  type: string | Component<P>,
  props: any,
  ...children: any[]
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
  console.log(ev.target.value);
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
      <Test name="hackers" color={tick % 2 === 0 ? "blue" : "green"} />
      <Test name="ams" />
    </div>
  );
}

type Patch =
  | { action: "noop" }
  | { action: "insert"; element: ShadowNode }
  | {
      action: "update";
      props: Array<{ key: string; value: any }>;
      children: Patch[];
    }
  | { action: "update-text"; value: string }
  | { action: "delete" }
  | { action: "replace"; element: ShadowNode };

function getDiff(prev: ShadowNode, next: ShadowNode): Patch {
  if (typeof prev === "undefined" && typeof next === "undefined") {
    return { action: "noop" };
  } else if (typeof prev === "undefined") {
    return { action: "insert", element: next };
  } else if (typeof next === "undefined") {
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

function insertShadowNodeInto(elem: ShadowNode, target: HTMLElement) {
  let element: HTMLElement | Text;
  if (isShadowElement(elem)) {
    element = document.createElement(elem.type);
    for (let propName in elem.props) {
      (element as any)[propName] = elem.props[propName];
    }
    for (let child of elem.children) {
      if (child === undefined) continue;
      insertShadowNodeInto(child, element);
    }
  } else {
    element = document.createTextNode(elem as string);
  }
  target.appendChild(element);
}

function applyPatchInto(
  patch: Patch,
  parent: HTMLElement,
  target?: HTMLElement
) {
  if (!target && patch.action !== "insert") {
    throw new Error("Target is undefined, expected insert patch");
  }

  if (patch.action === "insert") {
    insertShadowNodeInto(patch.element, parent);
  } else if (patch.action === "delete") {
    parent.removeChild(target!);
  } else if (patch.action === "update-text") {
    target!.textContent = patch.value;
  } else if (patch.action === "update") {
    patch.props.forEach(p => {
      (target as any)[p.key] = p.value;
    });
    for (let i = 0; i < patch.children.length; i++) {
      const diff = patch.children[i];
      applyPatchInto(diff, target!, target!.childNodes[i] as HTMLElement);
    }
  }
}

let prevShadow: ShadowNode;
function render(elem: ShadowNode, root: HTMLElement) {
  const diff = getDiff(prevShadow, elem);
  prevShadow = elem;
  applyPatchInto(diff, root, root.childNodes[0] as HTMLElement);
}

setInterval(() => {
  let component = <App tick={Math.floor(Date.now() / 1000)} />;
  const root = document.querySelector("#app") as HTMLElement;
  render(component, root);
}, 1000);
