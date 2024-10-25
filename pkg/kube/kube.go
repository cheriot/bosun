package kube

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync"

	"bosun/pkg/logging"
	"bosun/pkg/util"

	"github.com/samber/lo"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
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
	matches := findAPIResources(kc.apiResources, query)
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

func findAPIResources(apiResources []metav1.APIResource, identifier string) []metav1.APIResource {
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
