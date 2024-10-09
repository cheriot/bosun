package desktop

import (
	"bosun/pkg/desktop/tabs"
	"context"
)

// App struct
type App struct {
	ctx context.Context
	Api *FrontendApi
}

// NewApp creates a new App application struct
func NewApp() *App {
	t := &tabs.Tabs{}
	t.NewTab()

	return &App{
		Api: &FrontendApi{
			tabs: t,
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
