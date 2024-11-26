package relations

import (
	"fmt"
	"reflect"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes/scheme"
)

type Reference struct {
	Group     string
	Version   string
	Kind      string
	Name      string
	Namespace string
}

func UnstructuredReferences(s *runtime.Scheme, u *unstructured.Unstructured) ([]Reference, error) {
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
		return nil, nil
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

	return typed, nil
}

var PodReferences = func(p *corev1.Pod) (refs []Reference) {
	refs = append(refs, Reference{
		Group:   corev1.SchemeGroupVersion.Group,
		Version: corev1.SchemeGroupVersion.Version,
		Kind:    "Namespace",
		Name:    p.GetNamespace(),
	})

	if p.Spec.NodeName != "" {
		refs = append(refs, Reference{
			Group:   corev1.SchemeGroupVersion.Group,
			Version: corev1.SchemeGroupVersion.Version,
			Kind:    "Node",
			Name:    p.Spec.NodeName,
		})
	}

	if p.Spec.ServiceAccountName != "" {
		refs = append(refs, Reference{
			Group:   corev1.SchemeGroupVersion.Group,
			Version: corev1.SchemeGroupVersion.Version,
			Kind:    "ServiceAccount",
			Name:    p.Spec.ServiceAccountName,
		})
	}

	// Mounted configmaps
	// Owners

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

var refFuncs = map[schema.GroupKind]any{
	KindKey(&corev1.Pod{}): PodReferences,
}
