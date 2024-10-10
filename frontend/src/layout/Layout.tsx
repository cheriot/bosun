import { type Component, ParentProps } from "solid-js";

const Layout: Component = (props: ParentProps) => {
    return (
        <div>
            <p>navigation and stuff</p>
            <div>{props.children}</div>
        </div>
    )
}

export { Layout }