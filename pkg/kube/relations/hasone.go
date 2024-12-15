package relations

import (
	"fmt"
	"reflect"
	"strings"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes/scheme"
)

type RelationType int

const (
	// Single object identified precisely (Pod -> Node)
	HasOne RelationType = iota
	// Search by group, kind, and labels (Service -> Pods)
	LabelSearch
	// Search that requires querying all objects of a group, kind (Node -> Pods)
	AttributeSearch
)

var AllRelationTypes = []RelationType{HasOne, LabelSearch, AttributeSearch}

func (w RelationType) String() string {
	switch w {
	case HasOne:
		return "HAS_ONE"
	case LabelSearch:
		return "LABLE_SEARCH"
	case AttributeSearch:
		return "ATTRIBUTE_SEARCH"
	default:
		return "???"
	}
}

func (w RelationType) TSName() string {
	return w.String()
}

type Reference struct {
	RelationType
	Group     string
	Version   string
	Kind      string
	Name      string
	Namespace string
	Property  string
}

func UnstructuredReferences(s *runtime.Scheme, u *unstructured.Unstructured) ([]Reference, error) {
	refs := MetaReferences(u)

	gk := u.GetObjectKind().GroupVersionKind().GroupKind()
	if gk.Kind == "" {
		return nil, fmt.Errorf("no kind for %v", u)
	}

	into, err := s.New(u.GetObjectKind().GroupVersionKind())
	if err != nil {
		return nil, fmt.Errorf("unable to intantiate unstructured: %w", err)
	}
	err = runtime.DefaultUnstructuredConverter.FromUnstructured(u.Object, into)
	if err != nil {
		return nil, fmt.Errorf("unable to convert FromUnstructured: %w", err)
	}

	f := refFuncs[gk]
	if f == nil {
		return refs, nil
	}

	// Call the function for this GroupKind
	v := reflect.ValueOf(f)
	rVals := v.Call([]reflect.Value{reflect.ValueOf(into)})
	// Verify the return type
	if len(rVals) != 1 {
		return nil, fmt.Errorf("expected one return value from refFuncs %v, but found %d", gk, len(rVals))
	}
	typed, ok := rVals[0].Interface().([]Reference)
	if !ok {
		return nil, fmt.Errorf("return type of refFuncs %v was not the expected Reference", gk)
	}

	refs = append(refs, typed...)
	return refs, nil
}

var PodReferences = func(p *corev1.Pod) (refs []Reference) {
	if p.Spec.NodeName != "" {
		refs = append(refs, Reference{
			RelationType: HasOne,
			Group:        corev1.SchemeGroupVersion.Group,
			Version:      corev1.SchemeGroupVersion.Version,
			Kind:         "Node",
			Name:         p.Spec.NodeName,
			Property:     ".spec.nodeName",
		})
	}

	if p.Spec.ServiceAccountName != "" {
		refs = append(refs, Reference{
			RelationType: HasOne,
			Group:        corev1.SchemeGroupVersion.Group,
			Version:      corev1.SchemeGroupVersion.Version,
			Kind:         "ServiceAccount",
			Name:         p.Spec.ServiceAccountName,
			Property:     ".spec.serviceAccountName",
		})
	}

	// Mounted configmaps

	return
}

func KindKey(o runtime.Object) schema.GroupKind {
	// TypeMeta for instantiated k8s objects is empty so this won't work:
	// *corev1.Pod{}.GetObjectKind().GroupVersionKind().GroupKind().String()

	// Look up o's type in client-go's scheme
	s := scheme.Scheme
	gvks, unversioned, err := s.ObjectKinds(o)
	if len(gvks) < 1 || unversioned || err != nil {
		panic(fmt.Sprintf("unable to find ObjectKinds for %T: %d %t %v", o, len(gvks), unversioned, err))
	}
	if len(gvks) > 1 {
		panic(fmt.Sprintf("found too many ObjectKinds for %T: %d %t", o, len(gvks), unversioned))
	}
	return gvks[0].GroupKind()
}

func FromOwnerReferences(ors []metav1.OwnerReference) (refs []Reference) {
	for i, or := range ors {
		// ReplicaSet: apps/v1
		// Pod: v1
		parts := strings.Split(or.APIVersion, "/")
		var group, version string
		if len(parts) == 1 {
			version = parts[0]
		}
		if len(parts) == 2 {
			group = parts[0]
			version = parts[1]
		}

		refs = append(refs, Reference{
			RelationType: HasOne,
			Group:        group,
			Version:      version,
			Kind:         or.Kind,
			Name:         or.Name,
			Property:     fmt.Sprintf(".metadata.ownerReferences[%d].name", i),
		})
	}

	return
}

func MetaReferences(u *unstructured.Unstructured) []Reference {
	refs := make([]Reference, 0)

	ns := u.GetNamespace()
	if ns != "" {
		refs = append(refs, Reference{
			RelationType: HasOne,
			Group:        corev1.SchemeGroupVersion.Group,
			Version:      corev1.SchemeGroupVersion.Version,
			Kind:         "Namespace",
			Name:         ns,
			Property:     ".metadata.namespace",
		})
	}

	refs = append(refs, FromOwnerReferences(u.GetOwnerReferences())...)

	return refs
}

var refFuncs = map[schema.GroupKind]any{
	KindKey(&corev1.Pod{}): PodReferences,
}
