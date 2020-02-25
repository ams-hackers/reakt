function createElement(element: string, props: any, ...children: any[]) {
  let elt = document.createElement(element);
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
  return (
    <div style="color: red">
      <p>
        Hello <strong>world</strong>
      </p>
    </div>
  );
}

function render(element: any, root: HTMLElement) {
  root.innerHTML = "";
  root.appendChild(element);
}

let component = Test();
render(component, document.querySelector("#app"));
