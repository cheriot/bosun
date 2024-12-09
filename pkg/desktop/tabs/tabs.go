package tabs

import (
	"fmt"

	"github.com/dchest/uniuri"
)

type Tab struct {
	Id           string
	K8sContext   string
	K8sNamespace string
	Path         string
	Title        string
}

type Tabs struct {
	Current string
	All     []*Tab
}

func MakeInitialTabs() *Tabs {
	t := &Tabs{}
	t.NewTab()
	return t
}

func (t *Tabs) Update(id string, k8sCtx string, k8sNs string, path string, title string) {
	found, idx := t.findTab(id)
	if found {
		tab := t.All[idx]
		if k8sCtx != "" {
			tab.K8sContext = k8sCtx
		}
		if k8sNs != "" {
			tab.K8sNamespace = k8sNs
		}
		if path != "" {
			tab.Path = path
		}
		if title != "" {
			tab.Title = title
		}
		fmt.Printf("Update tab %s %s", id, title)
	}

}

func (t *Tabs) SelectTab(id string) {
	t.Current = id
}

func (t *Tabs) CloseTab(id string) {
	found, deleteIdx := t.findTab(id)
	if found {
		deleteTab := t.All[deleteIdx]
		t.All = append(t.All[:deleteIdx], t.All[deleteIdx+1:]...)

		// Make sure there'a valid current tab
		fmt.Printf("delete tab %s %s\n", deleteTab.Id, t.Current)
		if deleteTab.Id == t.Current {
			if len(t.All) == 0 {
				t.NewTab()
			}

			if deleteIdx == 0 {
				t.Current = t.All[0].Id
			} else {
				t.Current = t.All[deleteIdx-1].Id
			}
		}
	}
}

func (t *Tabs) PrevTab() {
	found, currentIdx := t.findTab(t.Current)
	if found {
		n := wrapMod(currentIdx-1, len(t.All))
		t.Current = t.All[n].Id
	}
}

func (t *Tabs) NextTab() {
	found, currentIdx := t.findTab(t.Current)
	if found {
		n := (currentIdx + 1) % len(t.All)
		t.Current = t.All[n].Id
	}
}

func (t *Tabs) findTab(id string) (bool, int) {
	for i, t := range t.All {
		if t.Id == id {
			return true, i
		}
	}

	return false, 0
}

func (t *Tabs) NewTab() {
	newTab := Tab{
		Id:   uniuri.New(),
		Path: "/",
	}

	found, currentIdx := t.findTab(t.Current)
	if found {
		currentTab := t.All[currentIdx]
		newTab.K8sContext = currentTab.K8sContext
		newTab.K8sNamespace = currentTab.K8sNamespace
		newTab.Path = currentTab.Path
		newTab.Title = currentTab.Title
	}

	t.All = append(t.All, &newTab)
	t.SelectTab(newTab.Id)
}

func wrapMod(a, b int) int {
	// behave like python's % where -1 wraps to the end
	c := a % b
	if c < 0 {
		c += b
	}
	return c
}
