package store

import (
	"os"
	"testing"

	"bosun/pkg/desktop/tabs"

	"github.com/stretchr/testify/assert"
)

func MockFileStore(t *testing.T) *FileStore {
	file, err := os.CreateTemp("", "tabs.yml")
	assert.NoError(t, err)

	return &FileStore{
		tabsFile: file.Name(),
	}
}

func TestTabs(t *testing.T) {
	store := MockFileStore(t)

	_, found, err := store.ReadTabs()
	assert.False(t, found)
	assert.NoError(t, err)

	ts := &tabs.Tabs{}
	ts.NewTab()
	ts.NewTab()
	err = store.WriteTabs(ts)
	assert.NoError(t, err)

	tsRead, found, err := store.ReadTabs()
	assert.NoError(t, err)
	assert.True(t, found)
	assert.Equal(t, tsRead, ts)
}
