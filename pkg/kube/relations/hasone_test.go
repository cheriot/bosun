package relations

import (
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes/scheme"

	"github.com/stretchr/testify/assert"
)

func TestPodReferences(t *testing.T) {
	s := scheme.Scheme

	// The golang types don't have TypeMeta, which unstructured operations require.
	p := &corev1.Pod{
		TypeMeta: metav1.TypeMeta{
			APIVersion: corev1.SchemeGroupVersion.Version,
			Kind:       "Pod",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "example-pod",
			Namespace: "my-app",
			OwnerReferences: []metav1.OwnerReference{
				{
					APIVersion: "apps/v1",
					Name: "some-replicaset-skwod",
				},
			},
		},
	}
	assert.Equal(t, schema.GroupVersionKind(schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Pod"}), p.GetObjectKind().GroupVersionKind())

	// Convert to unstructured
	obj, err := runtime.DefaultUnstructuredConverter.ToUnstructured(p)
	assert.NoError(t, err)
	un := &unstructured.Unstructured{Object: obj}
	assert.NotEmpty(t, un)

	refs, err := UnstructuredReferences(s, un)
	assert.NoError(t, err)
	assert.NotEmpty(t, refs)

	nsRef := refs[0]
	assert.Equal(t, "Namespace", nsRef.Kind)
	assert.Equal(t, p.GetNamespace(), nsRef.Name)

	ownerRef := refs[1]
	assert.Equal(t, p.GetOwnerReferences()[0].Name, ownerRef.Name)
}

func TestKindKey(t *testing.T) {
	assert.Equal(t, schema.GroupKind(schema.GroupKind{Group: "", Kind: "Pod"}), KindKey(&corev1.Pod{}))
}

func TestOwnerReferences(t *testing.T) {
	rs := FromOwnerReferences([]metav1.OwnerReference{
		{
			APIVersion: "apps/v1",
			Kind:       "ReplicaSet",
			Name:       "coredns-576bfc4dc7",
		},
		{
			APIVersion: "v1",
			Kind:       "Pod",
			Name:       "foo",
		},
	})

	assert.Len(t, rs, 2)
	assert.Equal(t, rs[0].Group, "apps")
	assert.Equal(t, rs[0].Version, "v1")
	assert.Equal(t, rs[1].Group, "")
	assert.Equal(t, rs[1].Version, "v1")

	rs = FromOwnerReferences(nil)
	assert.Nil(t, rs)
}
