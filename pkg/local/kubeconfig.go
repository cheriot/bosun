package local

import (
	"sort"

	blog "bosun/pkg/logging"

	"k8s.io/client-go/tools/clientcmd"
)

type KubeContext struct {
	Name     string
	Cluster  string
	IsActive bool
}

func KubeContexts() []KubeContext {
	log := blog.Default().With("fn", "KubeContexts")

	rules := clientcmd.NewDefaultClientConfigLoadingRules()
	config, err := rules.Load()
	if err != nil {
		log.Error("unable to rules.Load()", "error", err)
		return nil
	}

	kubeContexts := make([]KubeContext, 0, len(config.Contexts))
	for name, context := range config.Contexts {
		kubeContexts = append(kubeContexts, KubeContext{
			Name:     name,
			Cluster:  context.Cluster,
			IsActive: name == config.CurrentContext,
		})
	}

	log.Debug("returning", "kubeContexts", kubeContexts)

	sort.SliceStable(kubeContexts, func(i int, j int) bool {
		// Sort the active cluster first, the rest alphabetically desc
		if kubeContexts[i].IsActive {
			return true
		}
		if kubeContexts[j].IsActive {
			return false
		}
		return kubeContexts[i].Name < kubeContexts[j].Name
	})
	return kubeContexts
}
