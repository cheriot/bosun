package desktop

import (
	"fmt"

	"bosun/pkg/desktop/tabs"
)

type FrontendApi struct {
	tabs *tabs.Tabs
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

func (fa *FrontendApi) NewTab() *tabs.Tabs {
	fa.tabs.NewTab()
	return fa.tabs
}
