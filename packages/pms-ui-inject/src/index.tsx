import React from "react";
import ReactDOM from "react-dom";

const App = () => {
    const test = (): number => {
        return 2;
    }
    return <>{test()}</>;
}

ReactDOM.render(
    <App />,
    document.body
);