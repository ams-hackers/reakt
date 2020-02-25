type Component = (props: any) => HTMLElement;

function createElement(
  element: string | Component,
  props: any,
  ...children: any[]
) {
  let elt;

  // console.log("createElement", { element, props, children });

  if (typeof element === "string") {
    elt = document.createElement(element);
  } else {
    elt = element(Object.assign({}, props, { children }));
  }

  for (let child of children) {
    if (child === undefined) continue;

    if (typeof child === "string") {
      child = document.createTextNode(child);
    }
    elt.appendChild(child);
  }

  for (let propName in props) {
    elt[propName] = props[propName];
  }

  return elt;
}

function Test({ name }) {
  let update = ev => {
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

function App() {
  return (
    <div>
      <Test name="hackers" />
      <Test name="ams" />
    </div>
  );
}

function render(element: any, root: HTMLElement) {
  root.innerHTML = "";
  root.appendChild(element);
}

let component = App();
render(component, document.querySelector("#app"));
