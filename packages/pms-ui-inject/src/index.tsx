import React from "react";
import ReactDOM from "react-dom";

const App = () => {
    const test = (): number => {
        return 4;
    }
    return <>{test()}</>;
}

ReactDOM.render(
    <App />,
    document.body
);