import { createElement, render, useTick } from "./reakt";

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

let update = (ev: any) => {
  console.log(ev.target && ev.target.value);
};

function Test({ name, color }: { name: string; color?: string }) {
  const tick = useTick(2000);

  return (
    <div style={`color: ${color}`}>
      <p>
        Hello <strong>{name}</strong> {tick}
        <input type="text" onkeydown={update} />
      </p>
    </div>
  );
}

function App() {
  const tick = useTick(1000);
  return (
    <div>
      <p>{tick}</p>
      {tick % 2 === 0 ? <p>odd!</p> : null}
      <Test name="hackers" color={tick % 2 === 0 ? "blue" : "green"} />
      <Test name="ams" color="red" />
    </div>
  );
}

// setInterval(() => {
let component = <App />;
const root = document.querySelector("#app")!;
render(component, root);
// }, 2000);
