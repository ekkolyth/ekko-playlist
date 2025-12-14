package httpx

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

// DecodeJSON reads JSON from the request body into dst.
// It enforces a max size and disallows unknown fields for safety.
// Returns an error if JSON is invalid or body is too large.
func DecodeJSON(write http.ResponseWriter, read *http.Request, dst any, maxBytes int64) error {
	// 1. Enforce a maximum body size (default 1MB if you pass 1<<20)
	read.Body = http.MaxBytesReader(write, read.Body, maxBytes)

	// 2. Create a decoder
	dec := json.NewDecoder(read.Body)
	dec.DisallowUnknownFields() // optional, stricter validation

	// 3. Decode JSON into the destination struct
	if err := dec.Decode(dst); err != nil {
		// Normalize common error types
		var syntaxErr *json.SyntaxError
		var unmarshalErr *json.UnmarshalTypeError

		switch {
		case errors.As(err, &syntaxErr):
			return errors.New("body contains badly-formed JSON")
		case errors.As(err, &unmarshalErr):
			return errors.New("body contains invalid value for a field")
		case errors.Is(err, io.EOF):
			return errors.New("body must not be empty")
		default:
			return errors.New("invalid JSON body")
		}
	}

	// 4. Make sure there's no trailing garbage like "{} garbage"
	if dec.More() {
		return errors.New("body must contain only a single JSON object")
	}

	return nil
}

