package kube

import (
	"context"
	"fmt"
	"slices"
	"sort"
	"strings"

	blog "bosun/pkg/logging"

	"github.com/samber/lo"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	runtime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	corev1client "k8s.io/client-go/kubernetes/typed/core/v1"
	restclient "k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	_ "k8s.io/client-go/plugin/pkg/client/auth"
)

type KubeCluster struct {
	name             string
	restClientConfig *restclient.Config
	apiResources     []metav1.APIResource
	scheme           *runtime.Scheme // Could be global since it's go types?
	dynamicClient    dynamic.Interface
}

func NewKubeCluster(kubeCtxName string) (*KubeCluster, error) {

	clientConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
		clientcmd.NewDefaultClientConfigLoadingRules(),
		&clientcmd.ConfigOverrides{CurrentContext: kubeCtxName})
	restClientConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("error creating restclient: %w", err)
	}

	dynamicClient, err := dynamic.NewForConfig(restClientConfig)
	if err != nil {
		return nil, fmt.Errorf("error creating dynamicClient: %w", err)
	}

	apiResource, err := fetchAllApiResources(restClientConfig)
	if err != nil {
		return nil, fmt.Errorf("error getting api-resources: %w", err)
	}

	// This could be global. It's not context/cluster specific
	scheme := runtime.NewScheme()
	err = schemeBuilder.AddToScheme(scheme)
	if err != nil {
		return nil, fmt.Errorf("NewKubeCluster failed to build scheme: %w", err)
	}

	return &KubeCluster{
		name:             kubeCtxName,
		restClientConfig: restClientConfig,
		apiResources:     apiResource,
		scheme:           scheme,
		dynamicClient:    dynamicClient,
	}, nil
}

func (kc *KubeCluster) KubeNamespaceList(ctx context.Context) ([]string, error) {
	coreclient, err := corev1client.NewForConfig(kc.restClientConfig)
	if err != nil {
		return []string{}, fmt.Errorf("unable to create coreclient for %s: %w", kc.name, err)
	}

	nsList, err := coreclient.Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return []string{}, fmt.Errorf("unable to list namespaces for %s: %w", kc.name, err)
	}

	nss := lo.Map(nsList.Items, func(ns corev1.Namespace, _ int) string {
		return ns.Name
	})
	slices.Sort(nss)
	return nss, nil
}

func fetchAllApiResources(restClientConfig *restclient.Config) ([]metav1.APIResource, error) {
	// Should this use runtime.Scheme or RESTMapper???
	// https://iximiuz.com/en/posts/kubernetes-api-structure-and-terminology/
	// https://iximiuz.com/en/posts/kubernetes-api-go-types-and-common-machinery/
	log := blog.Default()
	log.Info("fetchAllApiResources **Expensive**")

	client, err := discovery.NewDiscoveryClientForConfig(restClientConfig)
	if err != nil {
		return nil, fmt.Errorf("unable to create new discovery client for config: %w", err)
	}
	groups, resourceLists, err := client.ServerGroupsAndResources()
	if err != nil {
		return nil, fmt.Errorf("unable to get server groups and resources: %w", err)
	}
	// APIVersion == group/version

	// ignore deprecated GroupVersions for now
	notPreferred := make(map[string]bool)
	for _, g := range groups {
		if len(g.Versions) > 1 {
			for _, v := range g.Versions {
				if v != g.PreferredVersion {
					notPreferred[v.GroupVersion] = true
				}
			}
		}
	}

	var apiResources []metav1.APIResource
	for _, rls := range resourceLists {
		if !notPreferred[rls.GroupVersion] {
			for _, r := range rls.APIResources {
				group, version, err := splitGroupVersion(rls.GroupVersion)
				if err != nil {
					log.Error("error splitting GroupVersion on", "resourceList", rls, "error", err)
					continue
				}
				r.Group = group
				r.Version = version
				if !isSubresource(r) {
					apiResources = append(apiResources, r)
				}
			}
		}
	}

	// Quirky default: sort default groups first, service before pod
	sort.Slice(apiResources, func(i, j int) bool {
		igl := len(apiResources[i].Group)
		jgl := len(apiResources[j].Group)

		if igl != jgl {
			return igl < jgl
		}

		return apiResources[i].Kind > apiResources[j].Kind
	})
	return apiResources, nil
}

func splitGroupVersion(groupVersion string) (string, string, error) {
	parts := strings.Split(groupVersion, "/")
	if len(parts) == 2 {
		return parts[0], parts[1], nil
	}
	if len(parts) == 1 {
		// core resources like Pod are just v1 with no group.
		return "", groupVersion, nil
	}
	return "", "", fmt.Errorf("unexpected GroupVersion format %s", groupVersion)
}

func isSubresource(r metav1.APIResource) bool {
	return strings.Contains(r.Name, "/")
}
