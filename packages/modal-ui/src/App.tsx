import { batch, type Component, createSignal } from "solid-js";

const App: Component = () => {
  const [counter, setCounter] = createSignal(0);

  const incrementCounter = () => {
    batch(() => {
      setCounter((c) => c + 1);
    });
  };
  return (
    <>
      <p class="text-4xl text-app-white text-center py-20 bg-app-primary-600">Hello tailwind! hello</p>
      <br />
      <button onClick={incrementCounter}>Click to increment - {counter()}</button>
    </>
  );
};

export default App;
