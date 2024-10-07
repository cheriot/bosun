package desktop

import (
	"context"
	"fmt"

	"github.com/dchest/uniuri"
)

// App struct
type App struct {
	ctx context.Context
	Api *FrontendApi
}

// NewApp creates a new App application struct
func NewApp() *App {
	tabs := []Tab{
		{
			Id:           "adfasdf",
			K8sContext:   "kind-test-cluster",
			K8sNamespace: "istio-system",
			Page:         "SelectContext",
		},
		{
			Id:           ";lkjfdas",
			K8sContext:   "kind-test-cluster",
			K8sNamespace: "istio-system",
			Page:         "SelectContext",
		},
	}
	return &App{
		Api: &FrontendApi{
			tabs: Tabs{
				Current: tabs[0].Id,
				All:     tabs,
			},
		},
	}
}

// Startup is called at application startup
func (a *App) Startup(ctx context.Context) {
	// Perform your setup here
	a.ctx = ctx
}

// DomReady is called after front-end resources have been loaded
func (a App) DomReady(ctx context.Context) {
	// Add your action here
}

// BeforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue, false will continue shutdown as normal.
func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	return false
}

// Shutdown is called at application termination
func (a *App) Shutdown(ctx context.Context) {
	// Perform your teardown here
}

type FrontendApi struct {
	tabs Tabs
}

type Tab struct {
	Id           string
	K8sContext   string
	K8sNamespace string
	Page         string
}

type Tabs struct {
	Current string
	All     []Tab
}

// Greet returns a greeting for the given name
func (fa *FrontendApi) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (fa *FrontendApi) Tabs() Tabs {
	return fa.tabs
}

func (fa *FrontendApi) SelectTab(id string) Tabs {
	fa.tabs.Current = id
	return fa.tabs
}

func (fa *FrontendApi) currentTab() Tab {
	for _, t := range fa.tabs.All {
		if t.Id == fa.tabs.Current {
			return t
		}
	}

	panic(fmt.Sprintf("Unable to find current Tab %s", fa.tabs.Current))
}

func (fa *FrontendApi) NewTab() Tabs {
	currentTab := fa.currentTab()

	newTab := Tab{
		Id:           uniuri.New(),
		K8sContext:   currentTab.K8sContext,
		K8sNamespace: currentTab.K8sNamespace,
	}
	fa.tabs.All = append(fa.tabs.All, newTab)

	fa.SelectTab(newTab.Id)
	return fa.tabs
}
