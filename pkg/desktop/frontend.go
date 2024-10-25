package desktop

import (
	"context"
	"fmt"

	"bosun/pkg/desktop/tabs"
	"bosun/pkg/kube"
	"bosun/pkg/local"
)

type FrontendApi struct {
	tabs  *tabs.Tabs
	kubes *kube.Kubes
}

func MakeFrontendApi() *FrontendApi {
	t := &tabs.Tabs{}
	t.NewTab()
	return &FrontendApi{
		tabs:  t,
		kubes: kube.MakeKube(),
	}
}

// Greet returns a greeting for the given name
func (fa *FrontendApi) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (fa *FrontendApi) Tabs() *tabs.Tabs {
	return fa.tabs
}

func (fa *FrontendApi) SelectTab(id string) *tabs.Tabs {
	fa.tabs.Current = id
	return fa.tabs
}

func (fa *FrontendApi) CloseTab(id string) *tabs.Tabs {
	fa.tabs.CloseTab(id)
	return fa.tabs
}

func (fa *FrontendApi) PrevTab() *tabs.Tabs {
	fa.tabs.PrevTab()
	return fa.tabs
}

func (fa *FrontendApi) NextTab() *tabs.Tabs {
	fa.tabs.NextTab()
	return fa.tabs
}

func (fa *FrontendApi) UpdateTab(id string, k8sctx string, k8sns string) *tabs.Tabs {
	fa.tabs.Update(id, k8sctx, k8sns)
	return fa.tabs
}

func (fa *FrontendApi) NewTab() *tabs.Tabs {
	fa.tabs.NewTab()
	return fa.tabs
}

func (fa *FrontendApi) KubeContexts() []local.KubeContext {
	return local.KubeContexts()
}

func (fa *FrontendApi) KubeNamespaces(k8sCtx string) []string {
	c, err := fa.kubes.GetOrMakeKubeCluster(k8sCtx)
	if err != nil {
		fmt.Printf("TODO log, emit event %v", err)
		return []string{}
	}

	ns, err := c.KubeNamespaceList(context.Background())
	if err != nil {
		fmt.Printf("TODO log, emit event %v", err)
		return []string{}
	}

	fmt.Printf("found ns %v", ns)
	return ns
}
