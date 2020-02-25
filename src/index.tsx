type Component = (props: any) => HTMLElement;

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

function createElement(
  element: string | Component,
  props: any,
  ...children: any[]
) {
  let elt: any;

  // console.log("createElement", { element, props, children });

  if (typeof element === "string") {
    elt = document.createElement(element);
  } else {
    elt = element(Object.assign({}, props, { children }));
  }

  for (let child of children) {
    if (child === undefined) continue;

    if (!(child instanceof Element)) {
      child = document.createTextNode(child);
    }

    elt.appendChild(child);
  }

  for (let propName in props) {
    elt[propName] = props[propName];
  }

  return elt;
}

function Test({ name }: { name: string }) {
  let update = (ev: any) => {
    console.log(ev.target.value);
  };

  return (
    <div style="color: red">
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
      <Test name="hackers" />
      <Test name="ams" />
    </div>
  );
}

function render(element: any, root: HTMLElement) {
  root.innerHTML = "";
  root.appendChild(element);
}

setInterval(() => {
  let component = <App tick={Date.now()} />;
  render(component, document.querySelector("#app") as HTMLElement);
}, 1000);
