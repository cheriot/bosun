package tabs

import (
	"fmt"
	"github.com/dchest/uniuri"
)

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
		Id: uniuri.New(),
	}

	found, currentIdx := t.findTab(t.Current)
	if found {
		currentTab := t.All[currentIdx]
		newTab.K8sContext = currentTab.K8sContext
		newTab.K8sNamespace = currentTab.K8sNamespace
	}

	t.All = append(t.All, newTab)
	t.SelectTab(newTab.Id)
}
