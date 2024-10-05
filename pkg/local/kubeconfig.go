package local

import (
	"fmt"
	"k8s.io/client-go/tools/clientcmd"
)

type KubeContext struct {
	Name     string
	Cluster  string
	IsActive bool
}

func KubeContexts() []KubeContext {
	rules := clientcmd.NewDefaultClientConfigLoadingRules()
	config, err := rules.Load()
	if err != nil {
		fmt.Println(fmt.Errorf("Unable to rules.Load(): %w", err))
		return nil
	}

	kubeContexts := make([]KubeContext, len(config.Contexts))
	for name, context := range config.Contexts {
		kubeContexts = append(kubeContexts, KubeContext{
			Name:     name,
			Cluster:  context.Cluster,
			IsActive: name == config.CurrentContext,
		})
	}

	return kubeContexts
}
