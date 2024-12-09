package store

import (
	"fmt"
	"os"
	"path/filepath"

	"bosun/pkg/desktop/tabs"

	"github.com/adrg/xdg"
	"github.com/goccy/go-yaml"
)

const (
	APP_DIR  = "bosun"
	TAB_FILE = "tabs.yml"
)

type FileStore struct {
	tabsFile string
}

func MakeFileStore() (*FileStore, error) {
	tf, err := cacheFile(TAB_FILE)
	if err != nil {
		return nil, fmt.Errorf("tabsfile error: %w", err)
	}

	return &FileStore{
		tabsFile: tf,
	}, nil
}

func CacheTabs(tabs tabs.Tabs) error {
	return nil
}

func (fs *FileStore) ReadTabs() (*tabs.Tabs, bool, error) {
	// read fs.tabsFile
	data, err := os.ReadFile(fs.tabsFile)
	if err != nil {
		return nil, false, fmt.Errorf("unable to read tabs file %s: %w", fs.tabsFile, err)
	}

	content := string(data)
	if content == "" {
		return nil, false, nil
	}

	ts := &(tabs.Tabs{})
	if err := yaml.Unmarshal([]byte(content), ts); err != nil {
		return nil, false, fmt.Errorf("unable to unmarshal tabs: %w", err)
	}

	return ts, true, nil
}

func (fs *FileStore) WriteTabs(t *tabs.Tabs) error {
	bs, err := yaml.Marshal(t)
	if err != nil {
		return fmt.Errorf("unable to marshal tabs: %w", err)
	}

	err = os.WriteFile(fs.tabsFile, bs, 0644)
	if err != nil {
		return fmt.Errorf("unable to write tabs: %w", err)
	}

	return nil
}

func cacheFile(filename string) (string, error) {
	file, err := xdg.CacheFile(filepath.Join(APP_DIR, filename))
	if err != nil {
		return "", fmt.Errorf("unable to construct filename %s: %w", filename, err)
	}
	return file, nil
}
