import { createElement, render } from "./reakt";

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
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

setInterval(() => {
  let component = <App tick={Math.floor(Date.now() / 1000)} />;
  const root = document.querySelector("#app")!;
  render(component, root);
}, 1000);
