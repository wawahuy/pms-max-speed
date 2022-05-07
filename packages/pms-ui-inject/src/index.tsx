import React from "react";
import ReactDOM from "react-dom";
import {StatusBar} from "./components/StatusBar";

const App = () => {
    return (
        <>
            <StatusBar />
        </>
    )
}

ReactDOM.render(
    <App />,
    document.body
);