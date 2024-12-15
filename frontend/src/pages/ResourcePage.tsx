import type { Accessor, Component, InitializedResource } from "solid-js";
import { createEffect, createSignal, Show, For, Switch, Match } from "solid-js"
import { useSearchParams, useLocation } from "@solidjs/router";
import { pathResource, ResourceQuery } from '../models/navpaths';
import { setPageTitle } from '../models/pageMeta';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';
import { fetchK8sResource, KubeReference } from "../models/resourceData";
import { FindText } from "../components/FindFilter";
import { relations } from "../../wailsjs/go/models";
import styles from './ResourcePage.module.css';


export const ResourcePage: Component = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    createEffect(() => {
        setPageTitle(searchParams.name || "", location, searchParams)
        setBreadcrumbs(new BreadcrumbBuilder(searchParams).addK8xCtx().addK8sNs().addQuery().build())
    })

    const resourceQuery = (): ResourceQuery | undefined => {
        if (searchParams.k8sCtx && searchParams.k8sNs && searchParams.kind && searchParams.name) {
            return {
                k8sCtx: searchParams.k8sCtx,
                k8sNs: searchParams.k8sNs,
                group: searchParams.group || "",
                kind: searchParams.kind,
                name: searchParams.name
            }
        }
        console.error('not enough query parameters to fetch a resource', searchParams)
        return
    }

    const relationPath = (rel: relations.Reference): string => {
        if (searchParams.k8sCtx && searchParams.k8sNs) {
            let ns = rel.Namespace
            if (ns == "") {
                ns = searchParams.k8sNs
            }
            return pathResource({
                k8sCtx: searchParams.k8sCtx,
                k8sNs: ns,
                group: rel.Group,
                kind: rel.Kind,
                name: rel.Name,

            })
        } else console.error('expect k8sctx')
        return ""
    }

    const resource = fetchK8sResource(resourceQuery)

    const newYamlTab = 'hyper yaml'
    const describeTab = 'describe'
    const yamlTab = 'yaml'
    const nsTabs = [newYamlTab, describeTab, yamlTab]
    const [selectedTab, setSelectedTab] = createSignal(newYamlTab)

    return (
        <div>
            <FindText />

            <Show when={['pending', 'refreshing'].includes(resource.state)}>
                loading...
            </Show>

            <Show when={['errored'].includes(resource.state)}>
                error
            </Show>

            <Show when={resource.state == 'ready'}>
                <Show when={resource().references && resource().references.length > 0}>
                    Related: &nbsp;
                    <For each={resource().references}>
                        {(rel: relations.Reference, i) =>
                            <span>
                                <a href={relationPath(rel)}>
                                    {rel.Kind.toLowerCase()}
                                </a>
                                <Show when={i() != resource().references.length - 1}>
                                    ,
                                </Show>
                                &nbsp;
                            </span>
                        }
                    </For>
                </Show>

                <div class="tabs">
                    <ul>
                        <For each={nsTabs}>
                            {(t) =>
                                <li classList={{ "is-active": t == selectedTab() }}>
                                    <a onclick={() => setSelectedTab(t)}>{t}</a>
                                </li>
                            }
                        </For>
                    </ul>
                </div>

                <Show when={selectedTab() == newYamlTab && resource().object}>
                    <div class={styles.mainContent}>
                        <Yaml value={resource().object} references={referenceMap(resource().references)}/>
                    </div>
                </Show>

                <Show when={selectedTab() == describeTab}>
                    <pre class={styles.mainContent}>{resource().describe}</pre>
                </Show>

                <Show when={selectedTab() == yamlTab}>
                    <pre class={styles.mainContent}>{resource().yaml}</pre>
                </Show>
            </Show>
        </div>
    )
}

type YamlProps = {
    value: any
    indent?: number
    prefix?: string
    references: Map<string,KubeReference>
}
const Yaml: Component<YamlProps> = (props: YamlProps) => {
    const indent = props.indent || 0
    const indentStyle = `margin-left: ${indent * 1.5}rem`
    const prefix = props.prefix || ""
    return (
        <Switch>
            <Match when={props.value === null}>
                <span class={styles.yamlValue}>null</span>
            </Match>
            <Match when={typeof (props.value) === "string"}>
                <span class={styles.yamlValue}>
                    <YamlString value={props.value} prefix={prefix} references={props.references}/>
                </span>
            </Match>
            <Match when={Array.isArray(props.value)}>
                <Switch>
                    <Match when={props.value.length == 0}>
                        []
                    </Match>
                    <Match when={true}>
                        <For each={props.value}>
                            {v =>
                                <ol style={indentStyle} class={styles.yamlArray}>
                                    <li>
                                        <div class={styles.yamlArrayEntry}>
                                            <Yaml value={v} indent={0} prefix={prefix + "[]"} references={props.references}/>
                                        </div>
                                    </li>
                                </ol>
                            }
                        </For>
                    </Match>
                </Switch>
            </Match>
            <Match when={typeof (props.value) === "object"}>
                <For each={Object.keys(props.value)}>
                    {key =>
                        <div>
                            <span style={indentStyle} class={styles.yamlKey}>
                                {key}:&nbsp;
                            </span>
                            <Yaml value={props.value[key]} indent={indent + 1} prefix={prefix + "." + key} references={props.references}/>
                        </div>}
                </For>
            </Match>
            <Match when={true}>{props.value.toString()}</Match>
        </Switch>
    )
}

type YamlStringProps = {
    value: string
    prefix: string
    references: Map<string,KubeReference>
}
const YamlString: Component<YamlStringProps> = (props: YamlStringProps) => {
    const ref = props.references.get(props.prefix)
    if (ref) {
        return <a href={ref.path}>{props.value}</a>
    }
    return (
        props.value
    )
}

const referenceMap = (refs: Array<KubeReference>): Map<string,KubeReference> => {
    const m = new Map<string,KubeReference>()
    refs.filter(r => r.Property.length > 0).forEach(r => { m.set(r.Property, r) })
    return m
}