import { ResourceQuery } from "./navpaths"
import { createResource } from "solid-js"
import { KubeResource } from '../../wailsjs/go/desktop/FrontendApi';
import { kube } from '../../wailsjs/go/models';

export const fetchK8sResource = (query: () => ResourceQuery | undefined) => {
    const fetchResource = (source: ResourceQuery): Promise<kube.Resource> => {
        return KubeResource(source.k8sCtx, source.k8sNs, source.group, source.kind, source.name)
    }

    const [resource] = createResource(
        query,
        fetchResource,
        { initialValue: kube.Resource.createFrom({}) },
    )

    return resource
}