package tabs

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewTab(t *testing.T) {
	tabs := Tabs{}

	tabs.NewTab()
	tabs.NewTab()

	assert.Len(t, tabs.All, 2)

	tab0 := tabs.All[0]
	tab1 := tabs.All[1]
	assert.NotEmpty(t, tab0.Id)
	assert.NotEmpty(t, tab1.Id)
	assert.NotEqual(t, tab0.Id, tab1.Id)

	assert.Equal(t, tabs.Current, tab1.Id)
}

func TestDeleteMiddle(t *testing.T) {
	tabs := threeTabs()
	tabs.Current = "two"

	tabs.CloseTab("two")

	assert.Equal(t, []*Tab{
		{Id: "one"},
		{Id: "three"},
	}, tabs.All)

	assert.Equal(t, "one", tabs.Current)
}

func TestDeleteFirst(t *testing.T) {
	tabs := threeTabs()
	tabs.Current = "three"

	tabs.CloseTab("one")

	assert.Equal(t, []*Tab{
		{Id: "two"},
		{Id: "three"},
	}, tabs.All)

	assert.Equal(t, "three", tabs.Current)
}

func TestPrevTabMiddle(t *testing.T) {
	tabs := threeTabs()
	tabs.Current = "two"

	tabs.PrevTab()

	assert.Equal(t, "one", tabs.Current)
}

func TestPrevTabFirst(t *testing.T) {
	tabs := threeTabs()
	tabs.Current = "one"

	tabs.PrevTab()

	assert.Equal(t, "three", tabs.Current)
}

func threeTabs() Tabs {
	return Tabs{
		All: []*Tab{
			{Id: "one"},
			{Id: "two"},
			{Id: "three"},
		},
		Current: "two",
	}
}
