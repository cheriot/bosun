package kube

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync"

	"bosun/pkg/kube/relations"
	"bosun/pkg/logging"
	"bosun/pkg/util"

	"github.com/samber/lo"
	"gopkg.in/yaml.v3"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/kubectl/pkg/describe"
)

var log = logging.Default()

const LIST_LIMIT = 1000

type Kubes struct {
	lock        sync.RWMutex
	ctxClusters map[string]*KubeCluster
}

func MakeKube() *Kubes {
	return &Kubes{
		ctxClusters: map[string]*KubeCluster{},
	}
}

func (k *Kubes) GetOrMakeKubeCluster(kubeCtxName string) (*KubeCluster, error) {
	k.lock.Lock()
	defer k.lock.Unlock()

	kc, found := k.ctxClusters[kubeCtxName]
	if !found {
		var err error
		kc, err = NewKubeCluster(kubeCtxName)
		if err != nil {
			return nil, err
		}
		k.ctxClusters[kc.name] = kc
	}

	return kc, nil
}

type ResourceTable struct {
	APIResource   metav1.APIResource `json:"apiResource"`
	Table         *metav1.Table      `json:"table"`
	IsError       bool               `json:"isError"`
	TableRowNames []string           `json:"tableRowNames"`
}

func (kc *KubeCluster) Query(ctx context.Context, nsName string, query string) ([]ResourceTable, error) {
	log.Info("Query for", "query", query)
	matches := findAPIResourcesFuzzy(kc.apiResources, query)
	log.Info("matches found", "kinds", lo.Map(matches, func(ar metav1.APIResource, _ int) string { return ar.Kind }))

	results := lo.Map(matches, func(r metav1.APIResource, _ int) ResourceTable {
		table, err := kc.listResource(ctx, r, nsName)
		if err != nil {
			log.Error("listResource error for resource", "resource", r, "error", err)
			table = PrintError(err)
		}

		// Get a list of metadata.name for the object represented by each row. Ideally this would come from
		// Table.Rows[]Object but I'm not sure how to specify the includeObject policy or decode the RawExtension
		// instance.
		nameIdx := -1
		for i, cd := range table.ColumnDefinitions {
			if strings.ToLower(cd.Name) == "name" && cd.Type == "string" {
				nameIdx = i
			}
		}
		rowNames := make([]string, len(table.Rows))
		for i, row := range table.Rows {
			if nameIdx > -1 {
				rowNames[i] = row.Cells[nameIdx].(string)
			} else {
				rowNames[i] = ""
			}
		}

		return ResourceTable{
			APIResource:   r,
			Table:         table,
			IsError:       err != nil,
			TableRowNames: rowNames,
		}
	})

	// Maintain order of the results, but move empty tables to the end
	nonEmpty, empty := util.Partition(results, func(r ResourceTable) bool {
		return len(r.Table.Rows) > 0
	})
	orderedResults := append(nonEmpty, empty...)

	return orderedResults, nil
}

func (kc *KubeCluster) listResource(ctx context.Context, r metav1.APIResource, namespace string) (*metav1.Table, error) {
	var uList *unstructured.UnstructuredList
	var err error
	if r.Namespaced {
		uList, err = kc.dynamicClient.Resource(toGVR(r)).Namespace(namespace).List(ctx, metav1.ListOptions{Limit: LIST_LIMIT})
	} else {
		uList, err = kc.dynamicClient.Resource(toGVR(r)).List(ctx, metav1.ListOptions{Limit: LIST_LIMIT})
	}
	if err != nil {
		return nil, fmt.Errorf("dynamicClient list failed for %+v: %w", r, err)
	}

	return PrintList(kc.scheme, r, uList)
}

func findAPIResources(apiResources []metav1.APIResource, group string, kind string) []metav1.APIResource {
	equalsIgnoreCase := func(a string, b string) bool {
		return strings.ToLower(a) == strings.ToLower(b)
	}

	isMatch := func(r metav1.APIResource, _ int) bool {
		return equalsIgnoreCase(r.Group, group) && equalsIgnoreCase(r.Kind, kind)
	}

	return lo.Filter(apiResources, isMatch)
}

func findAPIResourcesFuzzy(apiResources []metav1.APIResource, identifier string) []metav1.APIResource {
	isMatch := func(r metav1.APIResource, _ int) bool {
		names := []string{
			strings.ToLower(r.Name),
			strings.ToLower(r.Kind),
			strings.ToLower(r.Group),
			strings.ToLower(r.SingularName),
		}
		names = append(names, r.Categories...)
		names = append(names, r.ShortNames...)
		return slices.Contains(names, strings.ToLower(identifier))
	}

	return lo.Filter(apiResources, isMatch)
}

type Resource struct {
	Describe   string                `json:"describe"`
	Yaml       string                `json:"yaml"`
	References []relations.Reference `json:"references"`
	Errors     []error               `json:"errors"`
}

func (kc *KubeCluster) GetResource(ctx context.Context, nsName string, group string, kind string, resourceName string) (*Resource, error) {
	errors := make([]error, 0)
	matches := findAPIResources(kc.apiResources, group, kind)
	if len(matches) == 0 {
		return nil, fmt.Errorf("unable to find an api resource: %s", kind)
	}

	apiResource := matches[0]
	if len(matches) > 1 {
		errors = append(errors, fmt.Errorf("found more APIResource matches than expected, %d, for GetKubeObject %+v", len(matches), matches))
	}

	unstructured, err := kc.getResource(ctx, apiResource, nsName, resourceName)
	if err != nil {
		return nil, fmt.Errorf("unable to GetKubeObject: %w", err)
	}

	yamlStr, err := renderYaml(unstructured)
	if err != nil {
		errors = append(errors, fmt.Errorf("unable to serialize yaml: %w", err))
	}

	refs, err := relations.UnstructuredReferences(kc.scheme, unstructured)
	if err != nil {
		errors = append(errors, fmt.Errorf("unable to extract references: %w", err))
	}

	// Sucks that this queries apiserver for the same object as above, but it's baked
	// into the kubectl lib for describe.
	describeStr, err := kc.Describe(ctx, nsName, group, kind, resourceName)
	if err != nil {
		errors = append(errors, fmt.Errorf("unable to describe: %w", err))
	}

	return &Resource{
		Yaml:       yamlStr,
		Describe:   describeStr,
		References: refs,
		Errors:     errors,
	}, nil
}

func (kc *KubeCluster) getResource(ctx context.Context, r metav1.APIResource, namespace string, name string) (*unstructured.Unstructured, error) {
	namespacable := kc.dynamicClient.Resource(toGVR(r))

	var ri dynamic.ResourceInterface
	if r.Namespaced {
		if namespace == "" {
			return nil, fmt.Errorf("namespaced resource, but an empty namespace name: %s '%s'", toGVR(r), namespace)
		}
		ri = namespacable.Namespace(namespace)
	} else {
		ri = namespacable
	}

	return ri.Get(ctx, name, metav1.GetOptions{})
}

func (kc *KubeCluster) Describe(ctx context.Context, nsName string, group string, kind string, resourceName string) (string, error) {
	matches := findAPIResources(kc.apiResources, group, kind)

	for _, apiResource := range matches {

		describer, found := describe.DescriberFor(toGK(apiResource), kc.restClientConfig)
		if !found {
			var restMapper *meta.DefaultRESTMapper
			if kc.scheme.IsGroupRegistered(apiResource.Group) {
				restMapper = meta.NewDefaultRESTMapper(kc.scheme.PrioritizedVersionsAllGroups())
			} else {
				restMapper = meta.NewDefaultRESTMapper([]schema.GroupVersion{toGV(apiResource)})
				scope := meta.RESTScopeNamespace
				if !apiResource.Namespaced {
					scope = meta.RESTScopeRoot
				}

				restMapper.Add(toGVK(apiResource), scope)
			}

			restMapping, err := restMapper.RESTMapping(toGK(apiResource))
			if err != nil {
				return "", fmt.Errorf("no RESTMapping for %v: %w", toGK(apiResource), err)
			}

			describer, found = describe.GenericDescriberFor(restMapping, kc.restClientConfig)
			if !found {
				return "", fmt.Errorf("unable to create a GenericDescriberFor %v", apiResource)
			}
		}

		return describer.Describe(nsName, resourceName, describe.DescriberSettings{ShowEvents: true, ChunkSize: 5})
	}

	return "", fmt.Errorf("no resources found matching %s", kind)
}

func renderYaml(unstructured *unstructured.Unstructured) (string, error) {
	// None of this managedFields nonsense
	if untyped, ok := unstructured.Object["metadata"]; ok {
		if md, ok := untyped.(map[string]interface{}); ok {
			delete(md, "managedFields")
		}
	}

	bs, err := yaml.Marshal(&unstructured.Object)
	if err != nil {
		return "", fmt.Errorf("unable to marshal unstructured: %w", err)
	}

	return string(bs), nil
}

func toGVR(r metav1.APIResource) schema.GroupVersionResource {
	return schema.GroupVersionResource{
		Group:    r.Group,
		Version:  r.Version,
		Resource: r.Name,
	}
}

func toGVK(r metav1.APIResource) schema.GroupVersionKind {
	return schema.GroupVersionKind{
		Group:   r.Group,
		Version: r.Version,
		Kind:    r.Kind,
	}
}

func toGV(r metav1.APIResource) schema.GroupVersion {
	return schema.GroupVersion{
		Group:   r.Group,
		Version: r.Version,
	}
}

func toGK(r metav1.APIResource) schema.GroupKind {
	return schema.GroupKind{
		Group: r.Group,
		Kind:  r.Kind,
	}
}
