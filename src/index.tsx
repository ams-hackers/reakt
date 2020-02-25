type ShadowElement = {
  type: string;
  props: any;
  children: Array<ShadowElement | string>;
};
type Component<P> = (props: P) => ShadowElement;

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// function createElement<P>(
//   element: string | Component<P>,
//   props: any,
//   ...children: any[]
// ) {
//   let elt: any;
//
//   // console.log("createElement", { element, props, children });
//
//   if (typeof element === "string") {
//     elt = document.createElement(element);
//   } else {
//     elt = element(Object.assign({}, props, { children }));
//   }
//
//   for (let child of children) {
//     if (child === undefined) continue;
//
//     if (!(child instanceof Element)) {
//       child = document.createTextNode(child);
//     }
//
//     elt.appendChild(child);
//   }
//
//   for (let propName in props) {
//     elt[propName] = props[propName];
//   }
//
//   return elt;
// }

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
    props,
    children
  };
}

function Test({ name, color }: { name: string; color?: string }) {
  let update = (ev: any) => {
    console.log(ev.target.value);
  };

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

function isShadowElement(elem: ShadowElement | string): elem is ShadowElement {
  return typeof (elem as any).type === "string";
}

function render(elem: ShadowElement | string, parent: HTMLElement) {
  let element: HTMLElement | Text;
  if (isShadowElement(elem)) {
    element = document.createElement(elem.type);
    for (let propName in elem.props) {
      (element as any)[propName] = elem.props[propName];
    }
    for (let child of elem.children) {
      if (child === undefined) continue;
      render(child, element);
    }
  } else {
    element = document.createTextNode(elem as string);
  }

  parent.appendChild(element);
}

setInterval(() => {
  let component = <App tick={Math.floor(Date.now() / 1000)} />;
  const root = document.querySelector("#app") as HTMLElement;
  root.innerHTML = "";
  render(component, root);
}, 1000);
