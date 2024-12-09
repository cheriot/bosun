package desktop

import (
	"context"
	"fmt"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"bosun/pkg/desktop/store"
	"bosun/pkg/desktop/tabs"
	"bosun/pkg/kube"
	"bosun/pkg/local"
)

type FrontendApi struct {
	ctx   context.Context
	tabs  *tabs.Tabs
	kubes *kube.Kubes
	store *store.FileStore
}

func MakeFrontendApi() *FrontendApi {
	fs, err := store.MakeFileStore()
	if err != nil {
		panic(err) // don't actually die
	}

	t, found, err := fs.ReadTabs()
	if err != nil {
		// most likely file not found
		log.Info("ReadTabs", "error", err)
	}
	if !found {
		t = tabs.MakeInitialTabs()
	}

	return &FrontendApi{
		tabs:  t,
		kubes: kube.MakeKube(),
		store: fs,
	}
}

func (fa *FrontendApi) SetCtx(ctx context.Context) {
	fa.ctx = ctx
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

func (fa *FrontendApi) UpdateTab(id string, k8sCtx string, k8sNs string, path string, title string) *tabs.Tabs {
	fa.tabs.Update(id, k8sCtx, k8sNs, path, title)
	err := fa.store.WriteTabs(fa.tabs)
	if err != nil {
		log.Error("unable to WriteTabs", "error", err)
	}
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

func (fa *FrontendApi) KubeResourceList(k8sCtx string, k8sNs string, query string) []kube.ResourceTable {
	kubeCluster, err := fa.kubes.GetOrMakeKubeCluster(k8sCtx)
	if err != nil {
		wailsruntime.LogErrorf(fa.ctx, "error getting cluster for name %s: %s", k8sCtx, err.Error())
		return []kube.ResourceTable{}
	}

	resourceTables, err := kubeCluster.Query(fa.ctx, k8sNs, query)
	if err != nil {
		wailsruntime.LogErrorf(fa.ctx, "error during query for %s %s %s: %s", k8sCtx, k8sNs, query, err.Error())
		// return the tables. Maybe the error is for only one of them.
	}
	return resourceTables
}

func (fa *FrontendApi) KubeResource(k8sCtx string, k8sNs string, group string, kind string, name string) *kube.Resource {
	kubeCluster, err := fa.kubes.GetOrMakeKubeCluster(k8sCtx)
	if err != nil {
		wailsruntime.LogErrorf(fa.ctx, "error getting cluster for name %s: %s", k8sCtx, err.Error())
		return &kube.Resource{}
	}

	r, err := kubeCluster.GetResource(fa.ctx, k8sNs, group, kind, name)
	if err != nil {
		wailsruntime.LogErrorf(fa.ctx, "error getting resource %s %s %s %s: %s", k8sCtx, k8sNs, kind, name, err.Error())
		return &kube.Resource{}
	}
	return r
}
