package httpx

import (
	"encoding/json"
	"net/http"
)

// write any value as a JSON response with the given status code
func RespondJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func RespondError(w http.ResponseWriter, status int, msg string) {
	RespondJSON(w, status, map[string]any{
		"error":   http.StatusText(status),
		"message": msg,
	})
}





