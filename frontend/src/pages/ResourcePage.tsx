import type { Component } from "solid-js";
import { createEffect, createSignal, Show, For, Switch, Match, onMount, onCleanup } from "solid-js"
import { useSearchParams, useLocation } from "@solidjs/router";
import { pathResource, ResourceQuery } from '../models/navpaths';
import { setPageTitle } from '../models/pageMeta';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';
import { fetchK8sResource, KubeReference } from "../models/resourceData";
import { FindText } from "../components/FindFilter";
import { relations } from "../../wailsjs/go/models";
import styles from './ResourcePage.module.css';
import _ from "lodash";


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
                        <YamlFixer value={resource().object} references={referenceMap(resource().references)} />
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
    path?: string
    freezePath?: string
    references: Map<string, KubeReference>
}

const YamlFixer: Component<YamlProps> = (props: YamlProps) => {
    let [showFrozenHeader, setShowFrozenHeader] = createSignal(false)
    let [frozenYaml, setFrozenYaml] = createSignal<Json>()
    let yMin = 0, yMax = 0 // yaml range on the y-axis relative to the document
    let yCacheYamlPath: Json[] // frozen header yaml for each pixel a scroll handler will need
    let yamlContainer: HTMLDivElement

    onMount(() => {
        let root = yamlContainer as HTMLDivElement

        // line height and font size styles MUST be inherited within the yaml display
        const lineHeight = parseInt(window.getComputedStyle(root).lineHeight)

        const yamlElements: HTMLElement[] = []
        const findYamlElements = (el: HTMLElement) => {
            // depth first so we list them top to bottom
            if (el.dataset.freezeYaml) {
                yamlElements.push(el)
            }
            for (let i = 0; i < el.children.length; i++) {
                findYamlElements(el.children[i] as HTMLElement)
            }
        }
        findYamlElements(root)

        if (yamlElements.length > 0) {
            yMin = yamlElements[0].getBoundingClientRect().y + window.scrollY
            yMax = yamlElements[yamlElements.length - 1].getBoundingClientRect().y + window.scrollY
        }

        const displayPaths = yamlElements.map((el: HTMLElement) => {
            const yamlPath = el.dataset.freezeYaml!
            const { depth, json } = parseYamlPath(yamlPath)

            const rect = el.getBoundingClientRect()
            // y-axis position relative to the document, rect is relative to the viewport
            const documentY = window.scrollY + rect.y
            // account for headers frozen above this one
            const start = documentY - (depth - 1) * lineHeight
            const end = documentY + rect.height - depth * lineHeight
            if (rect.height / lineHeight > depth && start < end) {
                return {
                    'start': start,
                    'end': end,
                    'yamlPath': yamlPath,
                    'pathJson': json,
                    'depth': depth,
                }
            }
            return undefined
        }).filter(v => v !== undefined)

        // Precalculate what to show for each y-axis value a scroll/resize event will need.
        yCacheYamlPath = new Array<Json>(Math.ceil(yMax - yMin))
        for (let i = 0; i < displayPaths.length; i++) {
            const dpath = displayPaths[i]
            const start = dpath.start - yMin
            const end = dpath.end - yMin

            for (let j = start; j < end; j++) {
                yCacheYamlPath[j] = dpath.pathJson
            }
        }
    })

    const scrollListener = () => {
        const vv = window.visualViewport!
        if (yMin <= vv.pageTop && vv.pageTop <= yMax) {
            setShowFrozenHeader(true)
            setFrozenYaml(yCacheYamlPath[vv.pageTop - yMin])
        } else {
            setShowFrozenHeader(false)
        }
    }
    document.addEventListener('scroll', scrollListener)
    onCleanup(() => document.removeEventListener('scroll', scrollListener))
    document.addEventListener('resize', scrollListener)
    onCleanup(() => document.removeEventListener('resize', scrollListener))

    return (
        <div ref={yamlContainer!}>
            <Show when={showFrozenHeader()}>
                <div class={styles.yamlPath}>
                    <FrozenYaml json={frozenYaml()} indent={0} />
                </div>
            </Show>

            <Yaml {...props} />
        </div>
    )
}

const indentStyle = (indent: number) => `margin-left: ${indent * 1.5}rem`

const pathAdd = (prefix: string, key: string) => `${prefix}.${key}`
const pathAddArray = (prefix: string, idx: number) => `${prefix}[${idx}]`

const freezePathAdd = (prefix: string, key: string) => `${prefix}${YAML_PATH_SEP}${key}`
const freezePathAddArray = (prefix: string, v: any) => {
    let content = ''
    if (v && !Array.isArray(v)) {
        const vKeys = yamlKeys(v)
        if (vKeys && vKeys.length > 0) {
            // the first property of the value appears in the frozen header
            const key = vKeys[0]
            // only the value's first line
            let val = v[key]

            let rightSide = ''
            if (Array.isArray(val)) rightSide = ''
            else if (typeof (val) == 'string') rightSide = val.split('\n', 1)[0]
            else if (val === null) rightSide = 'null'
            else if (typeof (val) == 'object') rightSide = ''
            else rightSide = val.toString()
            content = `${key}:${encodeURIComponent(rightSide)}`
        }
    }
    return `${prefix}${YAML_PATH_SEP}[${content}]`
}

type Json = any
const YAML_PATH_SEP = ',' // any char not returned from encodeURIComponent

const parseYamlPath = (yamlPath: string): { depth: number, json: Json } => {
    // .spec.containers.[command:].command
    // .spec.containers.[command:].volumeMounts
    // .spec.volumes.[name:kube-api-access-dk22g].projected.sources
    const parts = yamlPath.split(YAML_PATH_SEP).filter(v => v != '')

    type Acc = { depth: number, json: Json }
    return parts.reduceRight<Acc>((acc, part: string): Acc => {
        if (part.startsWith('[')) {
            if (part == '[]') {
                acc.depth++
                acc.json = [acc.json]
                return acc
            } else {
                // could be [key:], or [key:val]
                const content = part.substring(1, part.length - 1)
                let [key, value] = content.split(':', 2)
                if (value) value = decodeURIComponent(value)

                let nested = acc.json
                if (key) nested = Object.assign({ [key]: value }, nested || {})
                // An array's first property might be the same as the next one.
                // Ex. command in .spec.containers.[command:].command
                acc.depth += Object.keys(nested).length - Object.keys(acc.json || {}).length
                acc.json = [nested]
                return acc
            }
        } else {
            acc.json = {
                [part]: acc.json,
            }
            acc.depth++
            return acc
        }
    }, { depth: 0, json: undefined })
}

type FrozenYamlProps = {
    json: Json
    indent: number
}
const FrozenYaml: Component<FrozenYamlProps> = (props: FrozenYamlProps) => {

    // Same markup structure as <Yaml /> but fixed and only render keys
    return (
        <Switch>
            <Match when={Array.isArray(props.json)}>
                <For each={props.json}>
                    {(v) =>
                        <ol style={indentStyle(props.indent)} class={styles.yamlArray}>
                            <li>
                                <div class={styles.yamlArrayEntry}>
                                    <FrozenYaml json={v} indent={0} />
                                </div>
                            </li>
                        </ol>
                    }
                </For>
            </Match>
            <Match when={typeof (props.json) == 'object'}>
                <For each={yamlKeys(props.json)}>
                    {(key) =>
                        <div>
                            <span style={indentStyle(props.indent)} class={styles.yamlKey}>
                                {key}:&nbsp;
                            </span>
                            <FrozenYaml json={props.json[key]} indent={props.indent + 1} />
                        </div>}
                </For>
            </Match>
            <Match when={props.json}>{props.json.toString()}</Match>
        </Switch>
    )
}

const Yaml: Component<YamlProps> = (props: YamlProps) => {
    const indent = props.indent || 0
    const path = props.path || ""
    const freezePath = props.freezePath || ""
    const itrKeys = _.memoize(() => yamlKeys(props.value))

    return (
        <Switch>
            <Match when={props.value === null}>
                <span class={styles.yamlValue}>null</span>
            </Match>
            <Match when={typeof (props.value) === "string"}>
                <span class={styles.yamlValue}>
                    <YamlString value={props.value} path={path} indent={indent + 1} references={props.references} />
                </span>
            </Match>
            <Match when={Array.isArray(props.value)}>
                <Switch>
                    <Match when={props.value.length == 0}>
                        []
                    </Match>
                    <Match when={true}>
                        <For each={props.value}>
                            {(v, idx) =>
                                <ol style={indentStyle(indent)} class={styles.yamlArray}>
                                    <li>
                                        <div class={styles.yamlArrayEntry} data-freeze-yaml={freezePathAddArray(freezePath, v)}>
                                            <Yaml value={v} indent={0} path={pathAddArray(path, idx())} freezePath={freezePathAddArray(freezePath, v)} references={props.references} />
                                        </div>
                                    </li>
                                </ol>
                            }
                        </For>
                    </Match>
                </Switch>
            </Match>
            <Match when={typeof (props.value) === "object"}>
                <For each={itrKeys()}>
                    {key =>
                        <div data-freeze-yaml={freezePathAdd(freezePath, key)}>
                            <span style={indentStyle(indent)} class={styles.yamlKey}>
                                {key}:&nbsp;
                            </span>
                            <Yaml value={props.value[key]} indent={indent + 1} path={pathAdd(path, key)} freezePath={freezePathAdd(freezePath, key)} references={props.references} />
                        </div>}
                </For>
                <Show when={itrKeys().length == 0}>
                    {"{}"}
                </Show>
            </Match>
            <Match when={true}>{props.value.toString()}</Match>
        </Switch>
    )
}

const YamlString: Component<YamlProps> = (props: YamlProps) => {
    const ref = props.path ? props.references.get(props.path) : undefined
    if (ref) {
        return <a href={ref.path}>{props.value}</a>
    }

    const firstEnd = props.value.indexOf('\n')
    if (firstEnd != -1 && firstEnd != props.value.length - 1) {
        return <><span>|</span><pre style={indentStyle(props.indent || 0)} class={styles.yamlPre}>{props.value}</pre></>
    }

    return (
        props.value
    )
}

const referenceMap = (refs: Array<KubeReference>): Map<string, KubeReference> => {
    const m = new Map<string, KubeReference>()
    refs.filter(r => r.Property.length > 0).forEach(r => { m.set(r.Property, r) })
    return m
}

const yamlKeys = (obj: Record<string, any>): string[] => {
    const keys = Object.keys(obj)
    const nameIdx = keys.indexOf('name')
    if (nameIdx > -1) {
        for (let i = nameIdx; i > 0; i--) {
            keys[i] = keys[i - 1]
        }
        keys[0] = 'name'
    }
    return keys
}