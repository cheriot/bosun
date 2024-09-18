package main

import (
	"fmt"
	"maps"
	"slices"

	"k8s.io/client-go/tools/clientcmd"
)

func main() {
	fmt.Println("Hi")
	rules := clientcmd.NewDefaultClientConfigLoadingRules()
	config, err := rules.Load()
	if err != nil {
		fmt.Println(fmt.Errorf("Unable to rules.Load(): %w", err))
	}

	fmt.Printf("%+v\n", config.Contexts["kind-test-cluster"])
	fmt.Println(slices.Collect(maps.Keys(config.Contexts)))
}
