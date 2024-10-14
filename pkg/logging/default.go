package logging

import (
	"context"
	"log/slog"
	"os"
)

var current = NewLogger(slog.LevelDebug)

func NewLogger(level slog.Level) *slog.Logger {
	h := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		AddSource: false,
		Level:     level,
	})
	return slog.New(h)
}

func Default() *slog.Logger {
	return current
}

type wailslog struct {
	log *slog.Logger
}

func NewWailsLog(l *slog.Logger) *wailslog {
	return &wailslog{
		log: l.WithGroup("wails"),
	}
}

func (w *wailslog) Print(message string) {
	w.log.Info(message)
}
func (w *wailslog) Trace(message string) {
	// LevelDebug is -4
	w.log.Log(context.Background(), -5, message)
}
func (w *wailslog) Debug(message string) {
	w.log.Debug(message)
}
func (w *wailslog) Info(message string) {
	w.log.Info(message)
}
func (w *wailslog) Warning(message string) {
	w.log.Info(message)
}
func (w *wailslog) Error(message string) {
	w.log.Error(message)
}
func (w *wailslog) Fatal(message string) {
	w.log.Error(message)
	panic(message)
}
