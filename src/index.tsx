function createElement(
  element: string | Function,
  props: any,
  ...children: any[]
) {
  let elt;

  if (typeof element === "string") {
    elt = document.createElement(element);
  } else {
    elt = element(Object.assign({}, {}));
  }

  for (let child of children) {
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

function Test() {
  let update = ev => {
    console.log(ev.target.value);
  };

  return (
    <div style="color: red">
      <p>
        Hello <strong>world</strong>
        <input type="text" onkeydown={update} />
      </p>
    </div>
  );
}

function App() {
  return (
    <div>
      <Test />
      <Test />
    </div>
  );
}

function render(element: any, root: HTMLElement) {
  root.innerHTML = "";
  root.appendChild(element);
}

let component = App();
render(component, document.querySelector("#app"));
