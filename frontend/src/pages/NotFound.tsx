import { Component } from "solid-js";

export const NotFound: Component = () => {
    return (
        <div>page not found {window.location.pathname}</div>
    )
}