package kube

import (
	"fmt"
	"time"

	printers "bosun/pkg/kube/copyofk8sprinters"
	"bosun/pkg/kube/copyofk8sprinters/internalversion"

	"github.com/samber/lo"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	runtime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/duration"
)

func PrintList(scheme *runtime.Scheme, ar metav1.APIResource, uList *unstructured.UnstructuredList) (*metav1.Table, error) {
	isRegistered := scheme.IsVersionRegistered(toGV(ar))
	if isRegistered {
		table, err := printRegistered(scheme, ar, uList)
		if err != nil {
			return nil, fmt.Errorf("printRegistered error: %w", err)
		}
		return table, nil
	}

	// fallback to [name, age] if no printer
	return printUnstructured(uList)
}

func PrintError(err error) *metav1.Table {
	return &metav1.Table{
		ColumnDefinitions: []metav1.TableColumnDefinition{{Name: "Error"}},
		Rows:              []metav1.TableRow{{Cells: []interface{}{err.Error()}}},
	}
}

func printRegistered(scheme *runtime.Scheme, ar metav1.APIResource, uList *unstructured.UnstructuredList) (*metav1.Table, error) {
	gvk := uList.GetObjectKind().GroupVersionKind()

	typedInstance, err := scheme.New(gvk)
	if err != nil {
		return nil, fmt.Errorf("failed New %+v: %w", gvk, err)
	}

	// Populate typedInstance with the data from uList
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(uList.UnstructuredContent(), typedInstance); err != nil {
		return nil, fmt.Errorf("unable to convert unstructured object to %v: %w", gvk, err)
	}

	tableGenerator := printers.NewTableGenerator().With(internalversion.AddHandlers)
	table, err := tableGenerator.GenerateTable(typedInstance, printers.GenerateOptions{})
	if err != nil {
		return nil, fmt.Errorf("unable to GenerateTable for %v: %w", gvk, err)
	}

	table.Rows = lo.Map(table.Rows, func(r metav1.TableRow, _ int) metav1.TableRow {
		// This contains the entire Pod. Don't send it down to the client.
		r.Object = runtime.RawExtension{}
		return r
	})

	return table, nil
}

func printUnstructured(uList *unstructured.UnstructuredList) (*metav1.Table, error) {
	columns := []metav1.TableColumnDefinition{
		{Name: "Name", Type: "string", Description: metav1.ObjectMeta{}.SwaggerDoc()["name"]},
		{Name: "Age", Type: "string", Description: metav1.ObjectMeta{}.SwaggerDoc()["creationTimestamp"]},
	}

	rows := lo.Map(uList.Items, func(item unstructured.Unstructured, _ int) metav1.TableRow {
		return metav1.TableRow{
			Cells: []interface{}{
				item.GetName(),
				translateTimestampSince(item.GetCreationTimestamp()),
			},
		}
	})

	return &metav1.Table{
		ColumnDefinitions: columns,
		Rows:              rows,
	}, nil
}

// translateTimestampSince returns the elapsed time since timestamp in
// human-readable approximation.
func translateTimestampSince(timestamp metav1.Time) string {
	if timestamp.IsZero() {
		return "<unknown>"
	}

	return duration.HumanDuration(time.Since(timestamp.Time))
}
