package handlers

import (
	"net/http"
	"time"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

var StartTime = time.Now()

func Health(w http.ResponseWriter, r *http.Request) {
	uptime := time.Since(StartTime)
	status := map[string]any{
		"status": "ok",
		"uptime": uptime.String(),
	}
	logging.Api("Health Check OK")
	httpx.RespondJSON(w, http.StatusOK, status)
}

